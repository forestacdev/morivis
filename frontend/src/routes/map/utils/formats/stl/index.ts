import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

type StlGeometry = THREE.BufferGeometry & {
	alpha?: number;
};

const createStlMaterial = (geometry: StlGeometry) => {
	const sourceAlpha = geometry.alpha;
	const opacity = typeof sourceAlpha === 'number' && Number.isFinite(sourceAlpha)
		? THREE.MathUtils.clamp(sourceAlpha, 0, 1)
		: 1;

	return new THREE.MeshStandardMaterial({
		color: '#ffffff',
		vertexColors: geometry.hasAttribute('color'),
		opacity,
		transparent: opacity < 1
	});
};

/** ASCII / binary STLを、morivisのmesh runtimeで扱うObject3Dへ正規化する。 */
export const parseStlArrayBuffer = (buffer: ArrayBuffer): THREE.Mesh => {
	if (buffer.byteLength === 0) {
		throw new Error('STLファイルが空です');
	}

	let geometry: StlGeometry;
	try {
		geometry = new STLLoader().parse(buffer) as StlGeometry;
	} catch {
		throw new Error('STLファイルを解析できませんでした');
	}

	const position = geometry.getAttribute('position');
	if (!position || position.count < 3) {
		geometry.dispose();
		throw new Error('STLファイルに三角形がありません');
	}
	if (!geometry.getAttribute('normal')) {
		geometry.computeVertexNormals();
	}

	return new THREE.Mesh(geometry, createStlMaterial(geometry));
};

export const parseStlFile = async (file: File): Promise<THREE.Mesh> =>
	parseStlArrayBuffer(await file.arrayBuffer());
