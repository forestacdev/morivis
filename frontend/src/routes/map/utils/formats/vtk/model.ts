import * as THREE from 'three';
import { summarizeVtk } from '.';
import { formatVtk } from './definition';
import { extractVtkSurface } from './surface';
import type { VtkData, VtkRenderOptions } from './types';

/** 青→シアン→黄→赤。GLB頂点色はlinear RGBで保持する。 */
export const vtkScalarColor = (value: number, min: number, max: number): THREE.Color => {
	if (!Number.isFinite(value)) return new THREE.Color('#808080');
	const fraction = max === min
		? 0.5
		: THREE.MathUtils.clamp((value / 2 - min / 2) / (max / 2 - min / 2), 0, 1);
	return new THREE.Color().setHSL((1 - fraction) * 2 / 3, 1, 0.5, THREE.SRGBColorSpace);
};

/** 形状はMeshEntryの既存GLB導線へ渡し、入力の解析値をentryへ直接持ち込まない。 */
export const createVtkModel = (data: VtkData, options: VtkRenderOptions): THREE.Group => {
	if (
		!Number.isFinite(options.unitScale) || options.unitScale <= 0
		|| !['z', 'y'].includes(options.upAxis)
	) {
		throw new Error('VTK: 単位または上方向が不正です');
	}
	const surface = extractVtkSurface(data);
	const summary = summarizeVtk(data, surface);
	const scalar = options.scalarId === null
		? undefined
		: summary.scalars.find(item => item.id === options.scalarId);
	if (options.scalarId !== null && !scalar) {
		throw new Error('VTK: 選択されたスカラーがありません');
	}
	const values = scalar ? data.scalars[Number(scalar.id)].values : undefined;
	if (surface.pointIndices.length * (scalar ? 36 : 24) > formatVtk.limits.maxOutputBytes) {
		throw new Error('VTK: 描画用の配列が192 MiBを超えています');
	}
	const origin = [data.points[0], data.points[1], data.points[2]];
	const position = new Float32Array(surface.pointIndices.length * 3);
	const colors = scalar ? new Float32Array(position.length) : undefined;
	for (let i = 0; i < surface.pointIndices.length; i++) {
		const id = surface.pointIndices[i];
		for (let axis = 0; axis < 3; axis++) {
			position[i * 3 + axis] = (surface.points[id * 3 + axis] - origin[axis])
				* options.unitScale;
			if (!Number.isFinite(position[i * 3 + axis])) {
				throw new Error('VTK: 描画できる座標範囲を超えています');
			}
		}
		if (scalar && colors && values) {
			let value: number;
			if (scalar.association === 'cell') {
				value = values[surface.cellIndices[Math.floor(i / 3)]];
			} else if (id < data.points.length / 3) value = values[id];
			else {
				const sample = surface.interpolations[id - data.points.length / 3];
				value = sample.weights.reduce(
					(sum, weight, i) => weight === 0 ? sum : sum + weight * values[sample.ids[i]],
					0
				);
			}
			vtkScalarColor(value, scalar.min, scalar.max).toArray(colors, i * 3);
		}
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
	if (colors) geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
	geometry.computeVertexNormals();
	const material = new THREE.MeshStandardMaterial({
		color: colors ? '#ffffff' : '#b8bec8',
		vertexColors: !!colors,
		roughness: 0.8,
		side: THREE.DoubleSide
	});
	const mesh = new THREE.Mesh(geometry, material);
	mesh.name = scalar ? `${scalar.name} (${scalar.association})` : 'VTK surface';
	mesh.position.set(
		origin[0] * options.unitScale,
		origin[1] * options.unitScale,
		origin[2] * options.unitScale
	);
	const root = new THREE.Group();
	root.add(mesh);
	if (options.upAxis === 'z') root.rotation.x = -Math.PI / 2;
	root.userData.vtk = {
		scalar: scalar ?? null,
		unitScale: options.unitScale,
		upAxis: options.upAxis
	};
	root.updateMatrixWorld(true);
	return root;
};

export const disposeVtkModel = (model: THREE.Group) => {
	model.traverse(object => {
		if (!(object instanceof THREE.Mesh)) return;
		object.geometry.dispose();
		const materials = Array.isArray(object.material) ? object.material : [object.material];
		materials.forEach(material => material.dispose());
	});
};
