import { FORMAT_RESOURCE_LIMITS } from '../resource-limits';
export const MAX_JP2_BYTES = FORMAT_RESOURCE_LIMITS.jpeg2000.maxFileBytes;
export const MAX_JP2_SAMPLES = FORMAT_RESOURCE_LIMITS.jpeg2000.maxSamples;
export const MAX_METADATA_BYTES = FORMAT_RESOURCE_LIMITS.jpeg2000.maxMetadataBytes;
const GEO_UUID = 'b14bf8bd083d4b43a5ae8cd7d5a6ce03';
export interface Jp2Container {
	codestream: Uint8Array;
	geoTiff?: ArrayBuffer;
}

/** サイズを検証しながらJP2ボックスを走査する。外部参照は解決しない。 */
export const parseJp2Container = (buffer: ArrayBuffer): Jp2Container => {
	const bytes = new Uint8Array(buffer), view = new DataView(buffer);
	if (bytes.length > MAX_JP2_BYTES) throw new Error('JP2は256 MiB以下にしてください');
	if (
		bytes.length < 12 || view.getUint32(0) !== 12 || view.getUint32(4) !== 0x6a502020
		|| view.getUint32(8) !== 0x0d0a870a
	) throw new Error('JPEG2000のJP2ファイルではありません');
	let codestream: Uint8Array | undefined, geoTiff: ArrayBuffer | undefined;
	let count = 0;
	const walk = (start: number, end: number, depth = 0) => {
		if (depth > 8) throw new Error('JP2の入れ子が深すぎます');
		for (let offset = start; offset < end;) {
			if (++count > 10_000 || offset + 8 > end) throw new Error('JP2のボックスが不正です');
			let length = view.getUint32(offset), header = 8;
			const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
			if (length === 1) {
				if (offset + 16 > end) throw new Error('JP2の拡張サイズが不正です');
				length = Number(view.getBigUint64(offset + 8));
				header = 16;
			} else if (length === 0) length = end - offset;
			if (!Number.isSafeInteger(length) || length < header || offset + length > end) {
				throw new Error('JP2が途中で切れているか、ボックスサイズが不正です');
			}
			const from = offset + header, to = offset + length;
			if (type === 'jp2c') {
				if (codestream) throw new Error('複数画像を含むJP2は未対応です');
				codestream = bytes.subarray(from, to);
			} else if (type === 'jp2h') walk(from, to, depth + 1);
			else if (type === 'uuid' && to - from >= 16) {
				const uuid = Array.from(
					bytes.subarray(from, from + 16),
					b => b.toString(16).padStart(2, '0')
				).join('');
				if (uuid === GEO_UUID) {
					if (geoTiff || to - from - 16 > MAX_METADATA_BYTES) {
						throw new Error('GeoJP2の座標情報が不正です');
					}
					geoTiff = buffer.slice(from + 16, to);
				}
			} else if (type === 'pclr' || type === 'cmap') {
				throw new Error('パレット／チャンネル変換を使うJP2は未対応です');
			} else if (type === 'colr') {
				if (
					to - from < 7 || bytes[from] !== 1
					|| ![16, 17].includes(view.getUint32(from + 3))
				) {
					throw new Error('sRGB・グレースケール以外のJP2色空間は未対応です');
				}
			} else if (type === 'cdef') {
				if (to - from < 2 || to - from !== 2 + view.getUint16(from) * 6) {
					throw new Error('JP2のチャンネル定義が不正です');
				}
				for (let p = from + 2; p < to; p += 6) {
					const channel = view.getUint16(p),
						kind = view.getUint16(p + 2),
						association = view.getUint16(p + 4);
					if (kind !== 0 || (association !== 0 && association !== channel + 1)) {
						throw new Error('このJP2のチャンネル順序・アルファ定義は未対応です');
					}
				}
			}
			offset = to;
		}
	};
	walk(0, bytes.length);
	if (!codestream) throw new Error('JP2に画像データがありません');
	return { codestream, geoTiff };
};

/** 復号前にSIZを読み、巨大な割り当てと未対応の成分配置を防ぐ。 */
export const inspectCodestream = (bytes: Uint8Array) => {
	const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (bytes.length < 43 || v.getUint32(0) !== 0xff4fff51) {
		throw new Error('JPEG2000の画像ヘッダーが不正です');
	}
	const length = v.getUint16(4), components = v.getUint16(40);
	const width = v.getUint32(8) - v.getUint32(16), height = v.getUint32(12) - v.getUint32(20);
	if (
		length !== 38 + components * 3 || 4 + length > bytes.length || components < 1
		|| components > 16
		|| width < 1 || height < 1 || !Number.isSafeInteger(width * height * components)
		|| width * height * components > MAX_JP2_SAMPLES
	) throw new Error('JP2は合計16,777,216サンプル以下にしてください');
	// 使用するOpenJPEGラッパーの出力は1成分または3成分に限られる。
	if (components !== 1 && components !== 3) {
		throw new Error('JP2は1バンドまたは3バンドに対応しています。アルファ付き画像は未対応です');
	}
	const bits = (bytes[42] & 127) + 1, signed = !!(bytes[42] & 128);
	if (bits > 16) throw new Error('JP2は1〜16bitの整数画素に対応しています');
	if (signed && bits <= 8) throw new Error('符号付き8bit以下のJP2は未対応です');
	for (let c = 0; c < components; c++) {
		const p = 42 + c * 3;
		if (bytes[p] !== bytes[42] || bytes[p + 1] !== 1 || bytes[p + 2] !== 1) {
			throw new Error('成分ごとに精度・解像度が異なるJP2は未対応です');
		}
	}
	return { width, height, components, bits, signed };
};
