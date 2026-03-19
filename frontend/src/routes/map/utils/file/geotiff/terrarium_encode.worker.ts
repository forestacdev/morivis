/**
 * Terrarium エンコーダー Worker
 *
 * TypedArray のバンドデータを正規化 Terrarium PNG にエンコードする。
 *
 * 正規化エンコード:
 *   normalized = (value - dataMin) / (dataMax - dataMin) * 65535
 *   R = floor(normalized / 256)
 *   G = floor(normalized) % 256
 *   B = floor((normalized % 1) * 256)
 *   A = 255 (nodata の場合は 0)
 *
 * デコード（シェーダー側）:
 *   normalized = (R * 256 + G + B / 256) / 65535
 *   value = normalized * (dataMax - dataMin) + dataMin
 */

const canvas = new OffscreenCanvas(1, 1);
const ctx = canvas.getContext('2d')!;

self.onmessage = async (e) => {
	const { band, width, height, nodata, dataMin, dataMax } = e.data as {
		band: ArrayLike<number>;
		width: number;
		height: number;
		nodata: number | null;
		dataMin: number;
		dataMax: number;
	};

	try {
		canvas.width = width;
		canvas.height = height;

		const imageData = ctx.createImageData(width, height);
		const pixels = imageData.data;
		const range = dataMax - dataMin;
		// range が 0 の場合は全ピクセル同じ値
		const invRange = range !== 0 ? 65535 / range : 0;

		for (let i = 0; i < band.length; i++) {
			const value = band[i];
			const pixIdx = i * 4;

			// nodata チェック
			const isNodata =
				nodata !== null
					? Number.isNaN(nodata)
						? Number.isNaN(value)
						: value === nodata
					: false;

			if (isNodata || !Number.isFinite(value)) {
				pixels[pixIdx] = 0;
				pixels[pixIdx + 1] = 0;
				pixels[pixIdx + 2] = 0;
				pixels[pixIdx + 3] = 0; // 透明 = nodata
				continue;
			}

			// 正規化: 0〜65535 の範囲にマッピング
			const normalized = (value - dataMin) * invRange;
			const clamped = Math.max(0, Math.min(65535, normalized));

			// Terrarium エンコード
			const r = Math.floor(clamped / 256);
			const g = Math.floor(clamped) % 256;
			const b = Math.floor((clamped % 1) * 256);

			pixels[pixIdx] = r;
			pixels[pixIdx + 1] = g;
			pixels[pixIdx + 2] = b;
			pixels[pixIdx + 3] = 255;
		}

		ctx.putImageData(imageData, 0, 0);
		const blob = await canvas.convertToBlob({ type: 'image/png' });

		self.postMessage({ blob });
	} catch (err) {
		self.postMessage({ error: err instanceof Error ? err.message : String(err) });
	}
};
