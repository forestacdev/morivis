// 任意の画素ブロックを持つ、1バンド・1ストリップ/タイルの架空TIFF。
export const createTestTiff = (
	block: Uint8Array,
	{
		width = 2,
		height = 2,
		bits = 16,
		sampleFormat = 2,
		predictor = 1,
		compression = 50000,
		tiled = false
	} = {}
) => {
	const dataOffset = 4096;
	const tags = [
		[256, 4, width],
		[257, 4, height],
		[258, 3, bits],
		[259, 3, compression],
		[262, 3, 1],
		[277, 3, 1],
		[284, 3, 1],
		[317, 3, predictor],
		[339, 3, sampleFormat],
		...(tiled
			? [[322, 4, width], [323, 4, height], [324, 4, dataOffset], [325, 4, block.length]]
			: [[273, 4, dataOffset], [278, 4, height], [279, 4, block.length]])
	].sort((a, b) => a[0] - b[0]);
	const buffer = new ArrayBuffer(dataOffset + block.length);
	const view = new DataView(buffer);
	view.setUint16(0, 0x4949, true);
	view.setUint16(2, 42, true);
	view.setUint32(4, 8, true);
	view.setUint16(8, tags.length, true);
	tags.forEach(([tag, type, value], index) => {
		const offset = 10 + index * 12;
		view.setUint16(offset, tag, true);
		view.setUint16(offset + 2, type, true);
		view.setUint32(offset + 4, 1, true);
		view.setUint32(offset + 8, value, true);
	});
	new Uint8Array(buffer, dataOffset).set(block);
	return buffer;
};
