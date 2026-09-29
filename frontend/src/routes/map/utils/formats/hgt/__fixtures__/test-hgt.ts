/** 実データを含まない人工格子。標準サイズは生成し、巨大なバイナリを保存しない。 */
export const createTestHgt = (width = 1201, height = width, allVoid = false): ArrayBuffer => {
	const buffer = new ArrayBuffer(width * height * 2);
	const view = new DataView(buffer);
	for (let index = 0; index < width * height; index++) view.setInt16(index * 2, -32768, false);
	if (!allVoid) {
		view.setInt16(0, 258, false);
		view.setInt16(2, -12, false);
		view.setInt16((width - 1) * 2, 8, false);
		view.setInt16(width * 2, 0, false);
		view.setInt16((width * (height - 1)) * 2, 16, false);
		view.setInt16(buffer.byteLength - 2, 32767, false);
	}
	return buffer;
};
