import type { McaMesh } from './mesh';
import type { ResourceMaterial } from './resources/types';

type BinaryArray = Float32Array<ArrayBuffer> | Uint8Array<ArrayBuffer> | Uint32Array<ArrayBuffer>;
interface Accessor {
	bufferView: number;
	byteOffset?: number;
	componentType: number;
	count: number;
	type: string;
	normalized?: boolean;
	min?: number[];
	max?: number[];
}
interface Material {
	name?: string;
	pbrMetallicRoughness: {
		baseColorFactor: number[];
		baseColorTexture?: { index: number; };
		metallicFactor: number;
		roughnessFactor: number;
	};
	alphaMode?: string;
	alphaCutoff?: number;
	doubleSided?: boolean;
	extras?: { morivisMinecraftMaterial: boolean; };
}

/** 各リージョンの座標を保持し、使用画像と材質を共通化してGLB内に埋め込む。 */
export const mcaMeshesToGlb = (meshes: McaMesh[], preserveWorldOrigin = true): ArrayBuffer => {
	const arrays: BinaryArray[] = [];
	const bufferViews: {
		buffer: number;
		byteOffset: number;
		byteLength: number;
		target?: number;
	}[] = [];
	const accessors: Accessor[] = [];
	const materials: Material[] = [{
		pbrMetallicRoughness: {
			baseColorFactor: [1, 1, 1, 1],
			metallicFactor: 0,
			roughnessFactor: 1
		}
	}];
	const images: { bufferView: number; mimeType: string; name: string; }[] = [];
	const textures: { sampler: number; source: number; }[] = [];
	const materialIds = new Map<string, number>();
	const textureIds = new Map<string, number>();
	let binarySize = 0;
	const addBuffer = (array: BinaryArray, target?: number) => {
		binarySize = Math.ceil(binarySize / 4) * 4;
		const id = bufferViews.length;
		bufferViews.push({
			buffer: 0,
			byteOffset: binarySize,
			byteLength: array.byteLength,
			...(target && { target })
		});
		arrays.push(array);
		binarySize += array.byteLength;
		return id;
	};
	const addAccessor = (accessor: Accessor) => {
		accessors.push(accessor);
		return accessors.length - 1;
	};
	const materialId = (material: ResourceMaterial) => {
		const key = `${material.key}/${material.alphaMode}`;
		const found = materialIds.get(key);
		if (found !== undefined) return found;
		let textureIndex: number | undefined;
		if (material.texture) {
			textureIndex = textureIds.get(material.texture.name);
			if (textureIndex === undefined) {
				textureIndex = textures.length;
				textureIds.set(material.texture.name, textureIndex);
				textures.push({ sampler: 0, source: images.length });
				images.push({
					bufferView: addBuffer(material.texture.png),
					mimeType: 'image/png',
					name: material.texture.name
				});
			}
		}
		const id = materials.length;
		materials.push({
			name: material.key,
			alphaMode: material.alphaMode,
			alphaCutoff: 0.1,
			doubleSided: true,
			extras: { morivisMinecraftMaterial: true },
			pbrMetallicRoughness: {
				baseColorFactor: [1, 1, 1, 1],
				metallicFactor: 0,
				roughnessFactor: 1,
				...(textureIndex !== undefined && { baseColorTexture: { index: textureIndex } })
			}
		});
		materialIds.set(key, id);
		return id;
	};
	const gltfMeshes = meshes.map((mesh) => {
		const attributes: Record<string, number> = {
			POSITION: addAccessor({
				bufferView: addBuffer(mesh.positions, 34962),
				componentType: 5126,
				count: mesh.positions.length / 3,
				type: 'VEC3',
				min: mesh.min,
				max: mesh.max
			}),
			NORMAL: addAccessor({
				bufferView: addBuffer(mesh.normals, 34962),
				componentType: 5126,
				count: mesh.normals.length / 3,
				type: 'VEC3'
			}),
			COLOR_0: addAccessor({
				bufferView: addBuffer(mesh.colors, 34962),
				componentType: 5121,
				count: mesh.colors.length / 4,
				type: 'VEC4',
				normalized: true
			})
		};
		if (mesh.uvs) {
			attributes.TEXCOORD_0 = addAccessor({
				bufferView: addBuffer(mesh.uvs, 34962),
				componentType: 5126,
				count: mesh.uvs.length / 2,
				type: 'VEC2'
			});
		}
		const indexView = addBuffer(mesh.indices, 34963);
		return {
			primitives: (mesh.groups ?? [{ start: 0, count: mesh.indices.length }]).map((
				group
			) => ({
				attributes,
				indices: addAccessor({
					bufferView: indexView,
					byteOffset: group.start * 4,
					componentType: 5125,
					count: group.count,
					type: 'SCALAR'
				}),
				material: 'material' in group ? materialId(group.material) : 0
			}))
		};
	});
	binarySize = Math.ceil(binarySize / 4) * 4;
	const json = {
		asset: { version: '2.0', generator: 'morivis MCA importer' },
		scene: 0,
		scenes: [{ nodes: meshes.map((_, index) => index) }],
		nodes: meshes.map((mesh, index) => ({
			mesh: index,
			name: `Minecraft region ${index + 1}`,
			translation: preserveWorldOrigin
				? mesh.origin
				: [
					-(mesh.min[0] + mesh.max[0]) / 2,
					-mesh.min[1],
					-(mesh.min[2] + mesh.max[2]) / 2
				],
			extras: { minecraftOrigin: mesh.origin }
		})),
		meshes: gltfMeshes,
		materials,
		...(images.length
			&& {
				images,
				textures,
				samplers: [{ magFilter: 9728, minFilter: 9984, wrapS: 10497, wrapT: 10497 }]
			}),
		buffers: [{ byteLength: binarySize }],
		bufferViews,
		accessors
	};
	const text = new TextEncoder().encode(JSON.stringify(json));
	const jsonSize = Math.ceil(text.length / 4) * 4;
	const byteLength = 12 + 8 + jsonSize + 8 + binarySize;
	if (byteLength > 0xffffffff) {
		throw new Error(
			'変換後のモデルがGLBの4 GiB未満という形式上限を超えます。ファイルを分けて読み込んでください'
		);
	}
	const buffer = new ArrayBuffer(byteLength);
	const view = new DataView(buffer);
	view.setUint32(0, 0x46546c67, true);
	view.setUint32(4, 2, true);
	view.setUint32(8, byteLength, true);
	view.setUint32(12, jsonSize, true);
	view.setUint32(16, 0x4e4f534a, true);
	new Uint8Array(buffer, 20, jsonSize).fill(32);
	new Uint8Array(buffer, 20, text.length).set(text);
	view.setUint32(20 + jsonSize, binarySize, true);
	view.setUint32(24 + jsonSize, 0x004e4942, true);
	arrays.forEach((array, index) => {
		new Uint8Array(buffer, 28 + jsonSize + bufferViews[index].byteOffset, array.byteLength)
			.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
	});
	return buffer;
};
export const mcaMeshToGlb = (mesh: McaMesh, preserveWorldOrigin = false): ArrayBuffer =>
	mcaMeshesToGlb([mesh], preserveWorldOrigin);
