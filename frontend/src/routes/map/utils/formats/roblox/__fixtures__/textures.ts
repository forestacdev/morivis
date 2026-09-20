import {
	concat,
	encodeRbxl,
	floats,
	inst,
	interleaved,
	parents,
	prop,
	text,
	u32,
	vectors
} from './binary-world';

/** 架空の画像IDと、基本パーツに貼った上下左右を判定できるUV。 */
export const textureWorld = async (content = false) =>
	encodeRbxl(
		[
			inst(0, 'Workspace', [1], true),
			inst(1, 'Part', [2]),
			inst(2, 'Texture', [3]),
			prop(1, 'size', 0x0e, vectors([[4, 2, 8]])),
			prop(
				2,
				'Texture',
				content ? 0x22 : 0x01,
				content
					? concat(interleaved([1]), u32(1), text('rbxassetid://101'), u32(0), u32(0))
					: text('rbxassetid://101')
			),
			prop(2, 'Face', 0x12, interleaved([1])),
			prop(2, 'Color3', 0x0c, vectors([[0.5, 1, 0.25]])),
			prop(2, 'Transparency', 0x04, floats([0.25])),
			prop(2, 'StudsPerTileU', 0x04, floats([2])),
			prop(2, 'StudsPerTileV', 0x04, floats([4])),
			prop(2, 'OffsetStudsU', 0x04, floats([1])),
			prop(2, 'OffsetStudsV', 0x04, floats([-2])),
			prop(2, 'ZIndex', 0x03, interleaved([6])),
			parents([1, 2, 3], [-1, 1, 2]),
			{ kind: 'END', data: new TextEncoder().encode('</roblox>') }
		],
		'lz4',
		3,
		3
	);

/** 四隅に架空の座標・UVを持つFileMesh。LOD1を含む版でもLOD0は2面。 */
export const meshBytes = (major = 2, stride = 40) => {
	const header = major === 2 ? 12 : major === 3 ? 16 : major === 4 ? 24 : 32;
	const faceCount = major === 2 ? 2 : 3;
	const bytes = new Uint8Array(
		13 + header + 4 * stride + faceCount * 12 + (major === 2 ? 0 : 12)
	);
	bytes.set(new TextEncoder().encode(`version ${major}.00\n`));
	const view = new DataView(bytes.buffer);
	view.setUint16(13, header, true);
	if (major < 4) {
		bytes[15] = stride;
		bytes[16] = 12;
	}
	view.setUint32(13 + (major === 3 ? 8 : 4), 4, true);
	view.setUint32(13 + (major === 3 ? 12 : 8), faceCount, true);
	if (major === 3) view.setUint16(17, 4, true);
	if (major !== 2) view.setUint16(13 + (major === 3 ? 6 : 12), 3, true);
	const vertices = [[-2, -1, 0, 0, 0, 1, 0, 1], [2, -1, 0, 0, 0, 1, 1, 1], [
		2,
		1,
		0,
		0,
		0,
		1,
		1,
		0
	], [-2, 1, 0, 0, 0, 1, 0, 0]];
	vertices.forEach((v, i) =>
		v.forEach((n, j) => view.setFloat32(13 + header + i * stride + j * 4, n, true))
	);
	const start = 13 + header + stride * 4;
	[0, 1, 2, 0, 2, 3, ...(major === 2 ? [] : [0, 1, 2])].forEach((n, i) =>
		view.setUint32(start + i * 4, n, true)
	);
	if (major !== 2) {
		[0, 2, 3].forEach((n, i) => view.setUint32(start + faceCount * 12 + i * 4, n, true));
	}
	return bytes;
};
