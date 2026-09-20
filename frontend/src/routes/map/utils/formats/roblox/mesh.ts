export interface RobloxMesh {
	positions: Float32Array;
	normals: Float32Array;
	uvs: Float32Array;
	indices: Uint32Array;
}

/** FileMesh 2〜5の静的メッシュ。LOD0だけを使い、ボーン付きは誤表示せず通知する。 */
export const parseRobloxMesh = (bytes: Uint8Array): RobloxMesh => {
	const fail = (): never => {
		throw new Error('不正または未対応のMeshPart形式');
	};
	const version = new TextDecoder().decode(bytes.subarray(0, 13));
	if (!/^version [2345]\.0[01]\n$/.test(version)) return fail();
	const major = Number(version[8]);
	const size = major === 2 ? 12 : major === 3 ? 16 : major === 4 ? 24 : 32;
	const start = 13;
	if (bytes.length < start + size) return fail();
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const u16 = (offset: number) => view.getUint16(start + offset, true);
	const u32 = (offset: number) => view.getUint32(start + offset, true);
	if (u16(0) !== size) return fail();
	const stride = major < 4 ? bytes[start + 2] : 40;
	if (![36, 40].includes(stride) || (major < 4 && bytes[start + 3] !== 12)) return fail();
	if (major === 3 && u16(4) !== 4) return fail();
	if (major >= 4 && u16(14)) throw new Error('ボーン付きMeshPartは未対応');
	const count = u32(major === 3 ? 8 : 4), faces = u32(major === 3 ? 12 : 8);
	const lodCount = major === 2 ? 0 : u16(major === 3 ? 6 : 12);
	const vertexStart = start + size, faceStart = vertexStart + stride * count;
	const lodStart = faceStart + 12 * faces;
	if (!count || !faces || lodStart + lodCount * 4 > bytes.length) return fail();
	let lodEnd = faces;
	if (lodCount >= 2) {
		let previous = 0;
		for (let i = 0; i < lodCount; i++) {
			const value = view.getUint32(lodStart + i * 4, true);
			if (value < previous || value > faces || (i === 0 && value !== 0)) return fail();
			if (i === 1) lodEnd = value;
			previous = value;
		}
	}
	const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
	const uvs = new Float32Array(count * 2), indices = new Uint32Array(lodEnd * 3);
	for (let i = 0; i < count; i++) {
		for (let j = 0; j < 8; j++) {
			const value = view.getFloat32(vertexStart + stride * i + j * 4, true);
			if (!Number.isFinite(value)) return fail();
			if (j < 3) positions[i * 3 + j] = value;
			else if (j < 6) normals[i * 3 + j - 3] = value;
			else uvs[i * 2 + j - 6] = value;
		}
	}
	for (let i = 0; i < indices.length; i++) {
		const index = view.getUint32(faceStart + i * 4, true);
		if (index >= count) return fail();
		indices[i] = index;
	}
	return { positions, normals, uvs, indices };
};
