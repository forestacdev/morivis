import type { McaMesh } from './mesh';

/** 各リージョンの頂点をローカルのまま保ち、nodeのtranslationでワールド位置を表す。 */
export const mcaMeshesToGlb = (meshes: McaMesh[], preserveWorldOrigin = true): ArrayBuffer => {
	const arrays = meshes.flatMap(
		mesh => [mesh.positions, mesh.normals, mesh.colors, mesh.indices]
	);
	let binarySize = 0;
	const bufferViews = arrays.map((array, index) => {
		const byteOffset = binarySize;
		binarySize += array.byteLength;
		return {
			buffer: 0,
			byteOffset,
			byteLength: array.byteLength,
			target: index % 4 === 3 ? 34963 : 34962
		};
	});
	const json = {
		asset: { version: '2.0', generator: 'morivis MCA importer' },
		scene: 0,
		scenes: [{ nodes: meshes.map((_, index) => index) }],
		nodes: meshes.map((mesh, index) => ({
			mesh: index,
			name: `Minecraft region ${index + 1}`,
			translation: preserveWorldOrigin ? mesh.origin : [
				-(mesh.min[0] + mesh.max[0]) / 2,
				-mesh.min[1],
				-(mesh.min[2] + mesh.max[2]) / 2
			],
			extras: { minecraftOrigin: mesh.origin }
		})),
		meshes: meshes.map((_, index) => ({
			primitives: [{
				attributes: { POSITION: index * 4, NORMAL: index * 4 + 1, COLOR_0: index * 4 + 2 },
				indices: index * 4 + 3,
				material: 0
			}]
		})),
		materials: [{
			pbrMetallicRoughness: {
				baseColorFactor: [1, 1, 1, 1],
				metallicFactor: 0,
				roughnessFactor: 1
			}
		}],
		buffers: [{ byteLength: binarySize }],
		bufferViews,
		accessors: meshes.flatMap((mesh, index) => [
			{
				bufferView: index * 4,
				componentType: 5126,
				count: mesh.positions.length / 3,
				type: 'VEC3',
				min: mesh.min,
				max: mesh.max
			},
			{
				bufferView: index * 4 + 1,
				componentType: 5126,
				count: mesh.normals.length / 3,
				type: 'VEC3'
			},
			{
				bufferView: index * 4 + 2,
				componentType: 5121,
				count: mesh.colors.length / 4,
				type: 'VEC4',
				normalized: true
			},
			{
				bufferView: index * 4 + 3,
				componentType: 5125,
				count: mesh.indices.length,
				type: 'SCALAR'
			}
		])
	};
	const text = new TextEncoder().encode(JSON.stringify(json));
	const jsonSize = Math.ceil(text.length / 4) * 4;
	const byteLength = 12 + 8 + jsonSize + 8 + binarySize;
	// GLBヘッダーのlengthはuint32。桁あふれした壊れたファイルを作らない。
	if (byteLength > 0xffffffff) {
		throw new Error(
			'変換後のモデルがGLBの4 GiB未満という形式上限を超えます。ファイルを分けて読み込んでください'
		);
	}
	const buffer = new ArrayBuffer(byteLength);
	const view = new DataView(buffer);
	view.setUint32(0, 0x46546c67, true);
	view.setUint32(4, 2, true);
	view.setUint32(8, buffer.byteLength, true);
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

/** Worker内で完結する、頂点色付き静的メッシュ用のGLB 2.0書き出し。 */
export const mcaMeshToGlb = (mesh: McaMesh, preserveWorldOrigin = false): ArrayBuffer =>
	mcaMeshesToGlb([mesh], preserveWorldOrigin);
