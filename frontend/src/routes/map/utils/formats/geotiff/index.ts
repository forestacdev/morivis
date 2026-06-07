import type { TypedArray, ReadRasterResult } from 'geotiff';

import { getAdjustableRangeValue } from '$routes/map/data/types';
import type { RasterTiffStyle } from '$routes/map/data/types/raster';
import {
	GeoTiffCache,
	getDerivedRasterCacheKey,
	type BandDataRange
} from '$routes/map/utils/cache/raster/geotiff-cache';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
import { encodeBandsToTerrariumUrls } from '$routes/map/utils/formats/raster/terrarium';
import { renderTerrarium } from '$routes/map/utils/formats/raster/terrarium-render';
import {
	computeTerrainDerivatives,
	terminateTerrainDerivativesWorker
} from './terrain-derivatives';
import { computeTwiBand, terminateTwiWorker } from './twi';

/** バンドごとのTypedArray配列 */
export type RasterBands = TypedArray[];
export const TWI_CACHE_SUFFIX = 'twi';
export const SLOPE_CACHE_SUFFIX = 'slope';
export const ASPECT_CACHE_SUFFIX = 'aspect';
export const TPI_CACHE_SUFFIX = 'tpi';
export const getTwiCacheKey = (id: string): string =>
	getDerivedRasterCacheKey(id, TWI_CACHE_SUFFIX);
export const getSlopeCacheKey = (id: string): string =>
	getDerivedRasterCacheKey(id, SLOPE_CACHE_SUFFIX);
export const getAspectCacheKey = (id: string): string =>
	getDerivedRasterCacheKey(id, ASPECT_CACHE_SUFFIX);
export const getTpiCacheKey = (id: string): string =>
	getDerivedRasterCacheKey(id, TPI_CACHE_SUFFIX);

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
const derivedRasterGenerationMap = new Map<string, Promise<BandDataRange | undefined>>();

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

export const cacheDerivedSingleBand = async (
	id: string,
	suffix: string,
	band: TypedArray,
	width: number,
	height: number,
	nodata: number | null,
	dataRange: BandDataRange
): Promise<void> => {
	const cacheKey = getDerivedRasterCacheKey(id, suffix);
	const urls = await encodeBandsToTerrariumUrls([band], width, height, nodata, [dataRange]);

	GeoTiffCache.setTerrarium(cacheKey, urls);
	GeoTiffCache.setDataRanges(cacheKey, [dataRange]);
	GeoTiffCache.setSize(cacheKey, width, height);
	GeoTiffCache.setNumBands(cacheKey, 1);
	if (GeoTiffCache.is4326(id)) {
		GeoTiffCache.markAs4326(cacheKey);
	}
	const bbox = GeoTiffCache.getBbox(id);
	if (bbox) {
		GeoTiffCache.setBbox(cacheKey, bbox);
	}
	const rawBbox = GeoTiffCache.getRawBbox(id);
	if (rawBbox) {
		GeoTiffCache.setRawBbox(cacheKey, rawBbox);
	}
};

export const ensureRasterDerivedCache = async (
	id: string,
	mode: RasterTiffStyle['visualization']['mode']
): Promise<BandDataRange | undefined> => {
	if (mode !== 'twi' && mode !== 'slope' && mode !== 'aspect' && mode !== 'tpi') {
		return undefined;
	}

	const cacheKey =
		mode === 'twi'
			? getTwiCacheKey(id)
			: mode === 'slope'
				? getSlopeCacheKey(id)
				: mode === 'aspect'
					? getAspectCacheKey(id)
					: getTpiCacheKey(id);
	const existingRange = GeoTiffCache.getDataRanges(cacheKey)?.[0];
	if (existingRange) return existingRange;

	const inFlight = derivedRasterGenerationMap.get(cacheKey);
	if (inFlight) return inFlight;

	const rawSingleBand = GeoTiffCache.getRawSingleBand(id);
	const size = GeoTiffCache.getSize(id);
	if (!rawSingleBand || !size) return undefined;

	const generationPromise = (async () => {
		if (mode === 'twi') {
			try {
				const result = await computeTwiBand(
					rawSingleBand.band,
					size.width,
					size.height,
					rawSingleBand.nodata
				);
				const range = { min: result.min, max: result.max };
				await cacheDerivedSingleBand(
					id,
					TWI_CACHE_SUFFIX,
					result.band,
					size.width,
					size.height,
					null,
					range
				);
				return range;
			} finally {
				terminateTwiWorker();
			}
		}

		try {
			const derivatives = await computeTerrainDerivatives(
				rawSingleBand.band,
				size.width,
				size.height,
				rawSingleBand.nodata,
				rawSingleBand.ewres,
				rawSingleBand.nsres
			);

			if (mode === 'slope') {
				const range = { min: 0, max: 90 };
				await cacheDerivedSingleBand(
					id,
					SLOPE_CACHE_SUFFIX,
					derivatives.slope.band,
					size.width,
					size.height,
					null,
					range
				);
				return range;
			}

			if (mode === 'aspect') {
				const range = { min: 0, max: 360 };
				await cacheDerivedSingleBand(
					id,
					ASPECT_CACHE_SUFFIX,
					derivatives.aspect.band,
					size.width,
					size.height,
					null,
					range
				);
				return range;
			}

			const range = { min: derivatives.tpi.min, max: derivatives.tpi.max };
			await cacheDerivedSingleBand(
				id,
				TPI_CACHE_SUFFIX,
				derivatives.tpi.band,
				size.width,
				size.height,
				null,
				range
			);
			return range;
		} finally {
			terminateTerrainDerivativesWorker();
		}
	})();

	derivedRasterGenerationMap.set(cacheKey, generationPromise);
	try {
		return await generationPromise;
	} finally {
		derivedRasterGenerationMap.delete(cacheKey);
	}
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
		const mode = visualization.mode;
		const cacheKey =
			mode === 'twi'
				? getTwiCacheKey(id)
				: mode === 'slope'
					? getSlopeCacheKey(id)
					: mode === 'aspect'
						? getAspectCacheKey(id)
						: mode === 'tpi'
							? getTpiCacheKey(id)
							: id;

		if (!GeoTiffCache.hasTerrarium(cacheKey)) {
			throw new Error('Terrarium data not found in cache');
		}

		const size = GeoTiffCache.getSize(cacheKey);
		if (!size) throw new Error('Size not found in cache');

		const dataRanges = GeoTiffCache.getDataRanges(cacheKey);
		if (!dataRanges) throw new Error('Data ranges not found in cache');

		const uniformsData = visualization.uniformsData;
		const colorMap =
			mode === 'single'
				? uniformsData.single.colorMap
				: mode === 'twi'
					? (uniformsData.twi?.colorMap ?? 'hsv')
					: mode === 'slope'
						? (uniformsData.slope?.colorMap ?? 'salinity')
						: mode === 'aspect'
							? (uniformsData.aspect?.colorMap ?? 'rainbow-soft')
							: mode === 'tpi'
								? (uniformsData.tpi?.colorMap ?? 'rdbu')
								: uniformsData.single.colorMap;
		const colorArray = colorMapManager.createColorArray(colorMap || 'bone');

		// Worker メッセージ構築
		const workerMessage: Record<string, unknown> = {
			entryId: cacheKey,
			type:
				mode === 'twi' || mode === 'slope' || mode === 'aspect' || mode === 'tpi' ? 'single' : mode,
			width: size.width,
			height: size.height
		};

		// 4326→メルカトル再投影
		if (GeoTiffCache.is4326(cacheKey)) {
			const bbox = GeoTiffCache.getBbox(cacheKey); // クリップ済み（表示用）
			const rawBbox = GeoTiffCache.getRawBbox(cacheKey); // 元の範囲（テクスチャUV計算用）
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
		if (!GeoTiffCache.isTextureTransferred(cacheKey)) {
			const terrariumUrls = GeoTiffCache.getTerrarium(cacheKey)!;
			const images = await Promise.all(
				terrariumUrls.map(async (url) => {
					const response = await fetch(url);
					const blob = await response.blob();
					return createImageBitmap(blob);
				})
			);
			workerMessage.images = images;
			GeoTiffCache.markTextureTransferred(cacheKey);
		}

		// Terrarium PNG に入っているのは実値ではなくバンド内での正規化値なので、
		// 表示レンジ側も同じ 0〜1 空間へ変換してから shader に渡す。
		// これにより shader 側では実値復元なしで色付けとレンジ調整ができる。
		if (mode === 'single') {
			const range = dataRanges[uniformsData.single.index];
			const dMin = range?.min ?? 0;
			const dMax = range?.max ?? 1;
			const invRange = dMax !== dMin ? 1 / (dMax - dMin) : 0;
			const [valueMin, valueMax] = getAdjustableRangeValue(
				uniformsData.single.range,
				uniformsData.single.min,
				uniformsData.single.max,
				dMin,
				dMax
			);

			workerMessage.bandIndex = uniformsData.single.index;
			workerMessage.min = (valueMin - dMin) * invRange;
			workerMessage.max = (valueMax - dMin) * invRange;
			workerMessage.colorArray = new Uint8Array(colorArray);
		} else if (mode === 'twi' || mode === 'slope' || mode === 'aspect' || mode === 'tpi') {
			const range = dataRanges[0];
			const derivedData =
				mode === 'twi'
					? uniformsData.twi
					: mode === 'slope'
						? uniformsData.slope
						: mode === 'aspect'
							? uniformsData.aspect
							: uniformsData.tpi;
			const dMin = range?.min ?? 0;
			const dMax = range?.max ?? 1;
			const invRange = dMax !== dMin ? 1 / (dMax - dMin) : 0;
			const [valueMin, valueMax] = getAdjustableRangeValue(
				derivedData?.range,
				derivedData?.min,
				derivedData?.max,
				dMin,
				dMax
			);

			workerMessage.bandIndex = 0;
			workerMessage.min = (valueMin - dMin) * invRange;
			workerMessage.max = (valueMax - dMin) * invRange;
			workerMessage.colorArray = new Uint8Array(colorArray);
		} else if (mode === 'multi') {
			const normalize = (val: number, dMin: number, dMax: number) =>
				dMax !== dMin ? (val - dMin) / (dMax - dMin) : 0;

			const rRange = dataRanges[uniformsData.multi.r.index];
			const gRange = dataRanges[uniformsData.multi.g.index];
			const bRange = dataRanges[uniformsData.multi.b.index];
			const [rMin, rMax] = getAdjustableRangeValue(
				uniformsData.multi.r.range,
				uniformsData.multi.r.min,
				uniformsData.multi.r.max,
				rRange.min,
				rRange.max
			);
			const [gMin, gMax] = getAdjustableRangeValue(
				uniformsData.multi.g.range,
				uniformsData.multi.g.min,
				uniformsData.multi.g.max,
				gRange.min,
				gRange.max
			);
			const [bMin, bMax] = getAdjustableRangeValue(
				uniformsData.multi.b.range,
				uniformsData.multi.b.min,
				uniformsData.multi.b.max,
				bRange.min,
				bRange.max
			);

			workerMessage.redIndex = uniformsData.multi.r.index;
			workerMessage.greenIndex = uniformsData.multi.g.index;
			workerMessage.blueIndex = uniformsData.multi.b.index;

			workerMessage.redMin = normalize(rMin, rRange.min, rRange.max);
			workerMessage.redMax = normalize(rMax, rRange.min, rRange.max);
			workerMessage.greenMin = normalize(gMin, gRange.min, gRange.max);
			workerMessage.greenMax = normalize(gMax, gRange.min, gRange.max);
			workerMessage.blueMin = normalize(bMin, bRange.min, bRange.max);
			workerMessage.blueMax = normalize(bMax, bRange.min, bRange.max);
		}

		const blob = await renderTerrarium(workerMessage);
		const url = URL.createObjectURL(blob);
		GeoTiffCache.setBlob(cacheKey, blob, url);
		return url;
	} catch (error) {
		console.error('Error rendering raster data', error);
	}
};
