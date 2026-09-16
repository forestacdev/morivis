// 架空の3DSと無圧縮CAB。外部サンプルから値を転記しない。
export const createTest3ds = (): Uint8Array<ArrayBuffer> => {
	const data = new Uint8Array(6);
	const view = new DataView(data.buffer);
	view.setUint16(0, 0x4d4d, true);
	view.setUint32(2, data.length, true);
	return data;
};

export const createTestCabinet = (
	entries: { path: string; data: Uint8Array; }[] = [
		{
			path: 'Info.ini',
			data: new TextEncoder().encode(
				'[3DS_DATA]\r\n3DS_FILE_NAME=test-model.3ds\r\n[SIKICHI]\r\nPOINT_CNT=0\r\n'
			)
		},
		{ path: 'test-model.3ds', data: createTest3ds() },
		{ path: 'test-texture.png', data: new Uint8Array([137, 80, 78, 71]) }
	]
): ArrayBuffer => {
	const names = entries.map(({ path }) => new TextEncoder().encode(path));
	const fileTableSize = names.reduce((size, name) => size + 16 + name.length + 1, 0);
	const contentSize = entries.reduce((size, entry) => size + entry.data.length, 0);
	const blockOffset = 44 + fileTableSize;
	const bytes = new Uint8Array(blockOffset + 8 + contentSize);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, 0x4643534d, true);
	view.setUint32(8, bytes.length, true);
	view.setUint32(16, 44, true);
	bytes[24] = 3;
	bytes[25] = 1;
	view.setUint16(26, 1, true);
	view.setUint16(28, entries.length, true);
	view.setUint32(36, blockOffset, true);
	view.setUint16(40, 1, true);
	view.setUint16(blockOffset + 4, contentSize, true);
	view.setUint16(blockOffset + 6, contentSize, true);
	let offset = 44;
	let contentOffset = 0;
	entries.forEach(({ data }, index) => {
		view.setUint32(offset, data.length, true);
		view.setUint32(offset + 4, contentOffset, true);
		view.setUint16(offset + 14, 0x80, true);
		bytes.set(names[index], offset + 16);
		bytes.set(data, blockOffset + 8 + contentOffset);
		offset += 16 + names[index].length + 1;
		contentOffset += data.length;
	});
	return bytes.buffer;
};
