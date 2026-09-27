import * as THREE from 'three';
import type { CadFormat, CadImporter, CadImportResult, CadMesh, CadNode, CadUpAxis } from './types';

export const getCadFormat = (name: string): CadFormat => {
	if (/\.(step|stp)$/i.test(name)) return 'step';
	if (/\.(iges|igs)$/i.test(name)) return 'iges';
	throw new Error('STEP（.step/.stp）またはIGES（.iges/.igs）を選択してください');
};

/** 単位換算をOCCTに任せ、以降の処理ではメートルを使う。 */
export const readCadFile = (importer: CadImporter, data: Uint8Array, name: string) => {
	const format = getCadFormat(name);
	if (!data.byteLength) throw new Error('STEP／IGESファイルが空です');
	const result = format === 'step'
		? importer.ReadStepFile(data, { linearUnit: 'meter' })
		: importer.ReadIgesFile(data, { linearUnit: 'meter' });
	if (!result.success) throw new Error('STEP／IGESファイルを解析できませんでした');
	if (!result.root || !result.meshes?.length) {
		throw new Error('表示できる面・立体がありません。線や点だけのCADデータは未対応です');
	}
	return result;
};

const createMaterial = (rgb?: number[] | null) => {
	const color = new THREE.Color('#b8bec8');
	if (
		rgb?.length === 3 && rgb.every(value => Number.isFinite(value) && value >= 0 && value <= 1)
	) {
		// OCCTのQuantity_Colorはlinear RGBを返す。
		color.setRGB(rgb[0], rgb[1], rgb[2], THREE.LinearSRGBColorSpace);
	}
	return new THREE.MeshStandardMaterial({ color, roughness: 0.65, side: THREE.DoubleSide });
};

const createMesh = (source: CadMesh) => {
	const positions = source.attributes.position.array;
	const indices = source.index.array;
	if (
		positions.length < 9 || positions.length % 3 || !positions.every(Number.isFinite)
		|| indices.length < 3 || indices.length % 3
		|| !indices.every(index =>
			Number.isInteger(index) && index >= 0 && index < positions.length / 3
		)
	) throw new Error('STEP／IGESのメッシュ形状が不正です');
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
	geometry.setIndex(indices);
	const normals = source.attributes.normal?.array;
	if (normals?.length === positions.length && normals.every(Number.isFinite)) {
		geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
	} else {
		geometry.computeVertexNormals();
	}
	const materials = [createMaterial(source.color)];
	const colors = new Map<string, number>();
	let cursor = 0;
	for (const face of [...(source.brep_faces ?? [])].sort((a, b) => a.first - b.first)) {
		if (!face.color || !Number.isInteger(face.first) || !Number.isInteger(face.last)) continue;
		const start = face.first * 3;
		const end = (face.last + 1) * 3;
		if (start < cursor || end <= start || end > indices.length) continue;
		if (start > cursor) geometry.addGroup(cursor, start - cursor, 0);
		const key = face.color.join(',');
		let materialIndex = colors.get(key);
		if (materialIndex === undefined) {
			materialIndex = materials.length;
			materials.push(createMaterial(face.color));
			colors.set(key, materialIndex);
		}
		geometry.addGroup(start, end - start, materialIndex);
		cursor = end;
	}
	if (cursor < indices.length) geometry.addGroup(cursor, indices.length - cursor, 0);
	const mesh = new THREE.Mesh(geometry, materials);
	mesh.name = source.name;
	return mesh;
};

export const disposeCadModel = (model: THREE.Object3D) => {
	const geometries = new Set<THREE.BufferGeometry>();
	const materials = new Set<THREE.Material>();
	model.traverse(child => {
		if (!(child instanceof THREE.Mesh)) return;
		geometries.add(child.geometry);
		const list = Array.isArray(child.material) ? child.material : [child.material];
		list.forEach(material => materials.add(material));
	});
	geometries.forEach(geometry => geometry.dispose());
	materials.forEach(material => material.dispose());
};

/** OCCTの部品階層・面色を保ち、既存GLB入力と同じY-upへ正規化する。 */
export const createCadModel = (result: CadImportResult, upAxis: CadUpAxis = 'z') => {
	if (!result.success || !result.root || !result.meshes?.length) {
		throw new Error('表示できる面・立体がありません');
	}
	const templates: THREE.Mesh[] = [];
	const holder = new THREE.Group();
	try {
		for (const source of result.meshes) {
			const mesh = createMesh(source);
			templates.push(mesh);
			holder.add(mesh);
		}
		let meshCount = 0;
		const buildNode = (node: CadNode): THREE.Group => {
			const group = new THREE.Group();
			group.name = node.name;
			for (const index of node.meshes) {
				if (!templates[index]) throw new Error('STEP／IGESの部品参照が不正です');
				group.add(templates[index].clone());
				meshCount++;
			}
			for (const child of node.children) group.add(buildNode(child));
			return group;
		};
		const root = buildNode(result.root);
		if (!meshCount) throw new Error('表示できる面・立体がありません');
		if (upAxis === 'z') root.rotation.x = -Math.PI / 2;
		root.updateMatrixWorld(true);
		return root;
	} catch (error) {
		disposeCadModel(holder);
		throw error;
	}
};
