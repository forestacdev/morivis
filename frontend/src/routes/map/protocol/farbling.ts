/**
 * Canvas Farbling検出 & transferToImageBitmapフォールバック
 *
 * BraveブラウザのCanvas Fingerprinting防止機能(farbling)により
 * convertToBlob()の出力にLSBノイズが注入される問題を回避する。
 * transferToImageBitmap()はCanvas serialization APIを経由しないため
 * farblingの影響を受けない。
 *
 * 参考: REPORT_canvas_farbling_fallback.md
 */

let farblingDetected: boolean | null = null;

/** Canvas getImageData()がfarblingされているか検出する（結果キャッシュ） */
export function isFarblingDetected(): boolean {
	if (farblingDetected !== null) return farblingDetected;
	farblingDetected = false;

	const size = 5;
	const canvas = new OffscreenCanvas(size, size);
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) return false;

	for (let i = 0; i < size * size; i++) {
		const base = i * 4;
		ctx.fillStyle = `rgb(${base},${base + 1},${base + 2})`;
		ctx.fillRect(i % size, Math.floor(i / size), 1, 1);
	}

	const data = ctx.getImageData(0, 0, size, size).data;
	for (let i = 0; i < size * size * 4; i++) {
		if (i % 4 !== 3 && data[i] !== i) {
			farblingDetected = true;
			break;
		}
	}

	return farblingDetected;
}

/**
 * OffscreenCanvasからBlobまたはImageBitmapを取得する。
 * farbling検出時はtransferToImageBitmap()を使用（Canvas serializationを完全に回避）。
 * 通常時はconvertToBlob()を使用。
 */
export async function convertCanvasToResult(
	canvas: OffscreenCanvas
): Promise<Blob | ImageBitmap> {
	if (isFarblingDetected()) {
		try {
			return canvas.transferToImageBitmap();
		} catch {
			// transferToImageBitmap失敗時はconvertToBlobにフォールバック（ノイズ許容）
		}
	}
	return await canvas.convertToBlob();
}
