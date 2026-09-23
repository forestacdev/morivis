// PNG生成時とDOMマーカーの拡大率をそろえる。
export const POI_HIGHLIGHT_SCALE = 1.2;

/** 距離場を出力ピクセルの中心で補間し、その後に輪郭の透明度へ変換する。 */
export const rasterizePoiSdf = (
	data: Uint8Array | Uint8ClampedArray,
	width: number,
	height: number,
	outputWidth: number,
	outputHeight: number,
	pixelRatio: number
): Uint8ClampedArray<ArrayBuffer> => {
	const pixels = new Uint8ClampedArray(outputWidth * outputHeight * 4);
	// MapLibre symbol_sdf.fragment.glsl と同じ輪郭位置・smoothstepを使う。
	const edge = 0.75;
	const gamma = 0.105 / (Math.min(outputWidth / width, outputHeight / height) * pixelRatio);
	const sample = (x: number, y: number) => data[(y * width + x) * 4 + 3] / 255;
	for (let y = 0; y < outputHeight; y++) {
		const sourceY = Math.max(0, Math.min(height - 1, (y + 0.5) * height / outputHeight - 0.5));
		const y0 = Math.floor(sourceY);
		const y1 = Math.min(y0 + 1, height - 1);
		const fy = sourceY - y0;
		for (let x = 0; x < outputWidth; x++) {
			const sourceX = Math.max(0, Math.min(width - 1, (x + 0.5) * width / outputWidth - 0.5));
			const x0 = Math.floor(sourceX);
			const x1 = Math.min(x0 + 1, width - 1);
			const fx = sourceX - x0;
			const top = sample(x0, y0) * (1 - fx) + sample(x1, y0) * fx;
			const bottom = sample(x0, y1) * (1 - fx) + sample(x1, y1) * fx;
			const distance = top * (1 - fy) + bottom * fy;
			const t = Math.max(0, Math.min(1, (distance - edge + gamma) / (2 * gamma)));
			const index = (y * outputWidth + x) * 4;
			pixels[index] = pixels[index + 1] = pixels[index + 2] = 255;
			pixels[index + 3] = Math.round(255 * t * t * (3 - 2 * t));
		}
	}
	return pixels;
};
