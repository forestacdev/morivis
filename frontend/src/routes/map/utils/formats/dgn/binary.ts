// DGNLib/GDALのISFF読み取り処理を参照。ライセンスはTHIRD_PARTY_NOTICES.md。
export const requireBytes = (view: DataView, offset: number, length: number) => {
	if (offset < 0 || offset + length > view.byteLength) {
		throw new Error('DGNの要素内データが欠損しています');
	}
};

/** ISFFの32bit整数は、16bitワードが上位から並ぶmiddle endian。 */
export const readInt32 = (view: DataView, offset: number): number => {
	requireBytes(view, offset, 4);
	return (view.getUint16(offset, true) << 16) | view.getUint16(offset + 2, true);
};

/** VAX D浮動小数点。先頭ワードに符号・指数・仮数上位7bitを持つ。 */
export const readVaxDouble = (view: DataView, offset: number): number => {
	requireBytes(view, offset, 8);
	const first = view.getUint16(offset, true);
	const exponent = (first >>> 7) & 0xff;
	if (exponent === 0) {
		if (first & 0x8000) throw new Error('DGNに不正なVAX浮動小数点があります');
		return 0;
	}
	const fraction = (first & 0x7f) / 128
		+ view.getUint16(offset + 2, true) / 2 ** 23
		+ view.getUint16(offset + 4, true) / 2 ** 39
		+ view.getUint16(offset + 6, true) / 2 ** 55;
	return (first & 0x8000 ? -1 : 1) * (1 + fraction) * 2 ** (exponent - 129);
};

export const readUnitName = (view: DataView, offset: number) =>
	String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1)).replace(/\0/g, '').trim();

export const hexBytes = (bytes: Uint8Array) =>
	Array.from(bytes, v => v.toString(16).padStart(2, '0')).join('');
