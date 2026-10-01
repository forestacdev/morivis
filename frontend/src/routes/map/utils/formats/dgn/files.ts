import { formatDgn } from './definition';

export const checkDgnSize = (file: Pick<File, 'size'>) => {
	if (!file.size) throw new Error('DGNファイルが空です');
	if (file.size > formatDgn.limits.maxFileBytes) throw new Error('DGNは64 MiB以下にしてください');
};

/** V7の要素境界を検査し、途中まで読めた壊れた図面を成功扱いにしない。 */
export const validateDgnBytes = (bytes: Uint8Array) => {
	const v8Container = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
	if (v8Container.every((value, index) => bytes[index] === value)) {
		throw new Error('DGN V8形式は未対応です。MicroStationでV7 DGNまたはDXFへ変換してください');
	}
	if (
		bytes.length < 1536 || ![0x08, 0xc8].includes(bytes[0])
		|| bytes[1] !== 0x09 || bytes[2] !== 0xfe || bytes[3] !== 0x02
	) throw new Error('DGN V7のヘッダーを確認できませんでした');
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let offset = 0;
	while (offset < bytes.length) {
		if (offset + 2 <= bytes.length && view.getUint16(offset, true) === 0xffff) return;
		if (offset + 4 > bytes.length) throw new Error('DGNの要素ヘッダーが欠損しています');
		const length = 4 + view.getUint16(offset + 2, true) * 2;
		if (offset + length > bytes.length) {
			throw new Error('DGNの要素が欠損しています');
		}
		offset += length;
	}
};
