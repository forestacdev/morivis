import { formatGif, GIF_MAX_DIMENSION } from './definition';

/** 復号前に構造と処理量を検査する。画素の復号・disposalの合成はFFmpegに任せる。 */
export const inspectGif = (bytes: Uint8Array) => {
	const invalid = () => new Error('GIFのデータが不正、または途中で切れています');
	if (bytes.length > formatGif.limits.maxFileBytes) throw new Error('GIFは32 MiB以下にしてください');
	if (bytes.length < 13 || !['GIF87a', 'GIF89a'].includes(new TextDecoder().decode(bytes.subarray(0, 6)))) {
		throw invalid();
	}
	const word = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8);
	const width = word(6);
	const height = word(8);
	if (!width || !height) throw invalid();
	if (width > GIF_MAX_DIMENSION || height > GIF_MAX_DIMENSION) {
		throw new Error('GIFの縦横は4096ピクセル以下にしてください');
	}
	let offset = 13;
	const skip = (length: number) => {
		if (offset + length > bytes.length) throw invalid();
		offset += length;
	};
	const skipBlocks = () => {
		while (true) {
			if (offset >= bytes.length) throw invalid();
			const length = bytes[offset++];
			if (!length) return;
			skip(length);
		}
	};
	if (bytes[10] & 0x80) skip(3 * 2 ** ((bytes[10] & 7) + 1));
	let frames = 0;
	while (offset < bytes.length) {
		const marker = bytes[offset++];
		if (marker === 0x3b) {
			if (!frames) throw invalid();
			return { width, height, frames };
		}
		if (marker === 0x21) {
			skip(1);
			skipBlocks();
		} else if (marker === 0x2c) {
			const descriptor = offset;
			skip(9);
			const frameWidth = word(descriptor + 4);
			const frameHeight = word(descriptor + 6);
			if (!frameWidth || !frameHeight || word(descriptor) + frameWidth > width || word(descriptor + 2) + frameHeight > height) {
				throw invalid();
			}
			frames++;
			if (frames * width * height > formatGif.limits.maxSamples) {
				throw new Error('GIFの総画素数が上限を超えています。サイズまたはフレーム数を減らしてください');
			}
			const packed = bytes[descriptor + 8];
			if (packed & 0x80) skip(3 * 2 ** ((packed & 7) + 1));
			skip(1);
			skipBlocks();
		} else {
			throw invalid();
		}
	}
	throw invalid();
};
