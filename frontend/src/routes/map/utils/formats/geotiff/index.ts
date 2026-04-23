import type { TypedArray, ReadRasterResult } from 'geotiff';

import type { RasterTiffStyle } from '$routes/map/data/types/raster';
import { GeoTiffCache, type BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
import { encodeBandsToTerrariumUrls } from '$routes/map/utils/formats/raster/terrarium';
import { renderTerrarium } from '$routes/map/utils/formats/raster/terrarium-render';

export { GeoTiffCache, GeoTiffImageCache } from '$routes/map/utils/cache/raster/geotiff-cache';
export type { BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';

/** バンドごとのTypedArray配列 */
export type RasterBands = TypedArray[];

// --- Utilities ---

export const getMinMax = (
	band: TypedArray,
	nodata: number | null
): { min: number; max: number } => {
	let min = Infinity;
	let max = -Infinity;

	for (let i = 0; i < band.length; i++) {
		const value = band[i];
		const isValid =
			Number.isFinite(value) &&
			(nodata === null ||
				(!Number.isNaN(nodata) && value !== nodata) ||
				(Number.isNaN(nodata) && !Number.isNaN(value)));
		if (isValid) {
			min = Math.min(min, value);
			max = Math.max(max, value);
		}
	}

	if (!Number.isFinite(min)) min = 0;
	if (!Number.isFinite(max)) max = 255;

	return { min, max };
};

export const parseRasterBands = (rasterData: ReadRasterResult): RasterBands => {
	if (Array.isArray(rasterData)) {
		return rasterData as RasterBands;
	}
	return [rasterData as TypedArray];
};

const colorMapManager = new ColorMapManager();

/**
 * 全バンドを Terrarium PNG にエンコードしてキャッシュする
 */
export const encodeAllBandsToTerrarium = async (
	id: string,
	bands: RasterBands,
	width: number,
	height: number,
	nodata: number | null,
	dataRanges: BandDataRange[]
): Promise<void> => {
	const urls = await encodeBandsToTerrariumUrls(bands, width, height, nodata, dataRanges);

	GeoTiffCache.setTerrarium(id, urls);
	GeoTiffCache.setDataRanges(id, dataRanges);
	GeoTiffCache.setSize(id, width, height);
	GeoTiffCache.setNumBands(id, bands.length);
};

// --- Rendering ---

/**
 * Terrarium PNG からレンダリングした最終画像を生成する。
 * 初回はキャッシュの Terrarium PNG を ImageBitmap に変換して Worker に転送。
 * 以降はユニフォーム値のみ送信。
 */
export const loadRasterData = async (
	id: string,
	visualization: RasterTiffStyle['visualization']
): Promise<string | undefined> => {
	try {
		if (!GeoTiffCache.hasTerrarium(id)) {
			throw new Error('Terrarium data not found in cache');
		}

		const size = GeoTiffCache.getSize(id);
		if (!size) throw new Error('Size not found in cache');

		const dataRanges = GeoTiffCache.getDataRanges(id);
		if (!dataRanges) throw new Error('Data ranges not found in cache');

		const mode = visualization.mode;
		const uniformsData = visualization.uniformsData;
		const colorArray = colorMapManager.createColorArray(uniformsData.single.colorMap || 'bone');

		// Worker メッセージ構築
		const workerMessage: Record<string, unknown> = {
			entryId: id,
			type: mode,
			width: size.width,
			height: size.height
		};

		// 4326→メルカトル再投影
		if (GeoTiffCache.is4326(id)) {
			const bbox = GeoTiffCache.getBbox(id); // クリップ済み（表示用）
			const rawBbox = GeoTiffCache.getRawBbox(id); // 元の範囲（テクスチャUV計算用）
			if (bbox && rawBbox) {
				workerMessage.reproject4326 = true;
				workerMessage.bboxDisplay = [bbox[0], bbox[1], bbox[2], bbox[3]];
				workerMessage.bboxSource = [rawBbox[0], rawBbox[1], rawBbox[2], rawBbox[3]];

				// メルカトルのアスペクト比で出力画像サイズを計算
				const DEG2RAD = Math.PI / 180;
				const latToMercY = (lat: number) => Math.log(Math.tan(lat * DEG2RAD * 0.5 + Math.PI / 4));
				const mercYMax = latToMercY(bbox[3]);
				const mercYMin = latToMercY(bbox[1]);
				const lngRange = bbox[2] - bbox[0];
				const mercYRange = mercYMax - mercYMin;

				// 幅は元画像と同じ、高さはメルカトルのアスペクト比に合わせる
				// WebGLの最大テクスチャサイズを超えないよう制限
				const MAX_SIZE = 4096;
				let outputWidth = size.width;
				let outputHeight = Math.round(outputWidth * (mercYRange / (lngRange * DEG2RAD)));

				if (outputWidth > MAX_SIZE || outputHeight > MAX_SIZE) {
					const scale = MAX_SIZE / Math.max(outputWidth, outputHeight);
					outputWidth = Math.round(outputWidth * scale);
					outputHeight = Math.round(outputHeight * scale);
				}

				workerMessage.outputWidth = outputWidth;
				workerMessage.outputHeight = outputHeight;
			}
		}

		// 初回: ImageBitmap を転送
		if (!GeoTiffCache.isTextureTransferred(id)) {
			const terrariumUrls = GeoTiffCache.getTerrarium(id)!;
			const images = await Promise.all(
				terrariumUrls.map(async (url) => {
					const response = await fetch(url);
					const blob = await response.blob();
					return createImageBitmap(blob);
				})
			);
			workerMessage.images = images;
			GeoTiffCache.markTextureTransferred(id);
		}

		// ユニフォーム値（min/max を CPU側で正規化: 0〜1）
		if (mode === 'single') {
			const range = dataRanges[uniformsData.single.index];
			const dMin = range?.min ?? 0;
			const dMax = range?.max ?? 1;
			const invRange = dMax !== dMin ? 1 / (dMax - dMin) : 0;

			workerMessage.bandIndex = uniformsData.single.index;
			workerMessage.min = (uniformsData.single.min - dMin) * invRange;
			workerMessage.max = (uniformsData.single.max - dMin) * invRange;
			workerMessage.colorArray = new Uint8Array(colorArray);
		} else if (mode === 'multi') {
			const normalize = (val: number, dMin: number, dMax: number) =>
				dMax !== dMin ? (val - dMin) / (dMax - dMin) : 0;

			const rRange = dataRanges[uniformsData.multi.r.index];
			const gRange = dataRanges[uniformsData.multi.g.index];
			const bRange = dataRanges[uniformsData.multi.b.index];

			workerMessage.redIndex = uniformsData.multi.r.index;
			workerMessage.greenIndex = uniformsData.multi.g.index;
			workerMessage.blueIndex = uniformsData.multi.b.index;

			workerMessage.redMin = normalize(uniformsData.multi.r.min, rRange.min, rRange.max);
			workerMessage.redMax = normalize(uniformsData.multi.r.max, rRange.min, rRange.max);
			workerMessage.greenMin = normalize(uniformsData.multi.g.min, gRange.min, gRange.max);
			workerMessage.greenMax = normalize(uniformsData.multi.g.max, gRange.min, gRange.max);
			workerMessage.blueMin = normalize(uniformsData.multi.b.min, bRange.min, bRange.max);
			workerMessage.blueMax = normalize(uniformsData.multi.b.max, bRange.min, bRange.max);
		}

		const blob = await renderTerrarium(workerMessage);
		const url = URL.createObjectURL(blob);
		GeoTiffCache.setBlob(id, blob, url);
		return url;
	} catch (error) {
		console.error('Error rendering raster data', error);
	}
};
