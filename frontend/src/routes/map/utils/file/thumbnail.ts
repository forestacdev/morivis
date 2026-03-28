/**
 * ラスターバンドデータからサムネイルPNG(DataURL)を生成する
 *
 * bboxが指定された場合はメルカトル補正を行い、
 * 指定されない場合は単純なリサイズを行う。
 */

export interface ThumbnailOptions {
	bands: ArrayLike<number>[];
	width: number;
	height: number;
	/** WGS84 bbox。指定時はメルカトル補正を行う */
	bbox?: [number, number, number, number];
	nodata?: number | null;
	ranges?: { min: number; max: number }[];
	/** サムネイルの最大辺（デフォルト: 256） */
	thumbSize?: number;
}

const DEG2RAD = Math.PI / 180;
const latToMercY = (lat: number) => Math.log(Math.tan(lat * DEG2RAD * 0.5 + Math.PI / 4));
const clampLat = (lat: number) => Math.max(-85, Math.min(85, lat));

export const generateThumbnail = (opts: ThumbnailOptions): string => {
	const {
		bands,
		width,
		height,
		bbox,
		nodata = null,
		ranges,
		thumbSize = 256
	} = opts;

	const numBands = bands.length;
	const isRgb = numBands >= 3;

	// サムネイルサイズを計算
	let thumbW: number;
	let thumbH: number;

	if (bbox) {
		// メルカトル補正
		const mercYMin = latToMercY(clampLat(bbox[1]));
		const mercYMax = latToMercY(clampLat(bbox[3]));
		const lngRange = bbox[2] - bbox[0];
		const mercYRange = mercYMax - mercYMin;
		const mercAspect = lngRange !== 0 ? mercYRange / (lngRange * DEG2RAD) : 1;

		if (mercAspect > 1) {
			thumbH = thumbSize;
			thumbW = Math.max(1, Math.round(thumbSize / mercAspect));
		} else {
			thumbW = thumbSize;
			thumbH = Math.max(1, Math.round(thumbSize * mercAspect));
		}
	} else {
		// 単純リサイズ
		const aspect = width / height;
		if (aspect > 1) {
			thumbW = thumbSize;
			thumbH = Math.max(1, Math.round(thumbSize / aspect));
		} else {
			thumbH = thumbSize;
			thumbW = Math.max(1, Math.round(thumbSize * aspect));
		}
	}

	const canvas = document.createElement('canvas');
	canvas.width = thumbW;
	canvas.height = thumbH;
	const ctx = canvas.getContext('2d')!;
	const imgData = ctx.createImageData(thumbW, thumbH);
	const pixels = imgData.data;

	// デフォルトranges
	const effectiveRanges = ranges ?? bands.map((band) => {
		let min = Infinity;
		let max = -Infinity;
		for (let i = 0; i < band.length; i++) {
			const v = band[i];
			if (nodata !== null && v === nodata) continue;
			if (!isFinite(v)) continue;
			if (v < min) min = v;
			if (v > max) max = v;
		}
		return { min: isFinite(min) ? min : 0, max: isFinite(max) ? max : 1 };
	});

	// メルカトル変換用
	const mercYMin = bbox ? latToMercY(clampLat(bbox[1])) : 0;
	const mercYMax = bbox ? latToMercY(clampLat(bbox[3])) : 0;
	const mercYRange = mercYMax - mercYMin;

	for (let ty = 0; ty < thumbH; ty++) {
		let srcY: number;
		if (bbox) {
			const mercY = mercYMax - (ty / thumbH) * mercYRange;
			const lat = (2 * Math.atan(Math.exp(mercY)) - Math.PI / 2) / DEG2RAD;
			srcY = Math.floor(((bbox[3] - lat) / (bbox[3] - bbox[1])) * height);
		} else {
			srcY = Math.floor((ty / thumbH) * height);
		}

		for (let tx = 0; tx < thumbW; tx++) {
			const srcX = Math.floor((tx / thumbW) * width);
			const dstIdx = (ty * thumbW + tx) * 4;

			if (srcX < 0 || srcX >= width || srcY < 0 || srcY >= height) {
				pixels[dstIdx + 3] = 0;
				continue;
			}

			const srcIdx = srcY * width + srcX;
			const val = bands[0][srcIdx];

			const isNd =
				nodata !== null
					? Number.isNaN(nodata)
						? Number.isNaN(val)
						: val === nodata
					: false;

			if (isNd || !Number.isFinite(val)) {
				pixels[dstIdx + 3] = 0;
			} else if (isRgb) {
				for (let b = 0; b < 3; b++) {
					const v = bands[b][srcIdx];
					const r = effectiveRanges[b];
					const norm = r.max !== r.min ? (v - r.min) / (r.max - r.min) : 0;
					pixels[dstIdx + b] = Math.max(0, Math.min(255, Math.round(norm * 255)));
				}
				pixels[dstIdx + 3] = 255;
			} else {
				const r = effectiveRanges[0];
				const norm = r.max !== r.min ? ((val - r.min) / (r.max - r.min)) * 255 : 0;
				const g = Math.max(0, Math.min(255, Math.round(norm)));
				pixels[dstIdx] = g;
				pixels[dstIdx + 1] = g;
				pixels[dstIdx + 2] = g;
				pixels[dstIdx + 3] = 255;
			}
		}
	}

	ctx.putImageData(imgData, 0, 0);
	return canvas.toDataURL('image/png');
};
