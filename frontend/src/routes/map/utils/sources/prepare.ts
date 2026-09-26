import type { MorivisLayerEntry } from '$routes/map/data/types';
import { createAdjustableRange, getAdjustableRangeValue } from '$routes/map/data/types';
import type {
	DerivedBandData,
	RasterImageEntry,
	RasterTiffStyle
} from '$routes/map/data/types/raster';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { JoinDataCache } from '$routes/map/utils/cache/join-data-cache';
import { GeoTiffCache, GeoTiffImageCache } from '$routes/map/utils/cache/raster/geotiff-cache';
import { getFgbToGeojson, getGeojson } from '$routes/map/utils/formats/geojson';
import {
	ensureRasterDerivedCache,
	getTopexCacheKey,
	getTwiCacheKey,
	loadRasterData
} from '$routes/map/utils/formats/geotiff';
import { CogTileManager } from '$routes/map/utils/formats/geotiff/cog_tile_manager';
import { NetCDFDataCache } from '$routes/map/utils/formats/netcdf/cache';
import { getBoundingBoxCorners } from '$routes/map/utils/map/bbox';
import type { ImageSourceSpecification } from '$routes/map/utils/maplibre';
import { resolveRequestUrl } from '$routes/map/utils/platform/request';
import { getRasterDimensionCurrentIndex } from '$routes/map/utils/raster/dimension-runtime';
import type { PreparedSourceData } from './index';

export interface SourcePreparationOptions {
	isCurrent?: () => boolean;
}
const alwaysCurrent = () => true;

const getRasterDerivedDefaultStyle = (
	mode: 'twi' | 'slope' | 'aspect' | 'tpi' | 'topex',
	range?: { min: number; max: number; }
): DerivedBandData => {
	return {
		colorMap: mode === 'twi'
			? 'hsv'
			: mode === 'slope'
			? 'salinity'
			: mode === 'aspect'
			? 'rainbow-soft'
			: 'rdbu',
		range: createAdjustableRange(
			range?.min
				?? (mode === 'aspect' ? 0 : mode === 'slope' ? 0 : mode === 'topex' ? -90 : -1),
			range?.max
				?? (mode === 'aspect' ? 360 : mode === 'slope' ? 90 : mode === 'topex' ? 90 : 1)
		)
	};
};

const getRasterTiffStyleId = (entry: RasterImageEntry<RasterTiffStyle>) => {
	const visualization = entry.style.visualization;
	const mode = visualization.mode;
	const timeIdx = getRasterDimensionCurrentIndex(entry) ?? -1;

	if (mode === 'single') {
		const uniformsData = visualization.uniformsData[mode];
		const [valueMin, valueMax] = getAdjustableRangeValue(
			uniformsData.range,
			uniformsData.min,
			uniformsData.max
		);
		return `${entry.id}_${mode}_${uniformsData.index}_${uniformsData.colorMap}_${valueMin}_${valueMax}_t${timeIdx}`;
	}

	if (mode === 'twi') {
		const uniformsData = visualization.uniformsData.twi
			?? getRasterDerivedDefaultStyle(
				'twi',
				GeoTiffCache.getDataRanges(getTwiCacheKey(entry.id))?.[0]
			);
		const [valueMin, valueMax] = getAdjustableRangeValue(
			uniformsData.range,
			uniformsData.min,
			uniformsData.max
		);
		return `${entry.id}_${mode}_${uniformsData.colorMap}_${valueMin}_${valueMax}_t${timeIdx}`;
	}

	if (mode === 'slope' || mode === 'aspect' || mode === 'tpi' || mode === 'topex') {
		const cacheKey = mode === 'topex' ? getTopexCacheKey(entry.id) : null;
		const uniformsData = visualization.uniformsData[mode]
			?? getRasterDerivedDefaultStyle(
				mode,
				cacheKey ? GeoTiffCache.getDataRanges(cacheKey)?.[0] : undefined
			);
		const [valueMin, valueMax] = getAdjustableRangeValue(
			uniformsData.range,
			uniformsData.min,
			uniformsData.max
		);
		return `${entry.id}_${mode}_${uniformsData.colorMap}_${valueMin}_${valueMax}_t${timeIdx}`;
	}

	if (mode === 'multi') {
		const uniformsData = visualization.uniformsData[mode];
		const [rMin, rMax] = getAdjustableRangeValue(
			uniformsData.r.range,
			uniformsData.r.min,
			uniformsData.r.max
		);
		const [gMin, gMax] = getAdjustableRangeValue(
			uniformsData.g.range,
			uniformsData.g.min,
			uniformsData.g.max
		);
		const [bMin, bMax] = getAdjustableRangeValue(
			uniformsData.b.range,
			uniformsData.b.min,
			uniformsData.b.max
		);
		return `${entry.id}_${mode}_${uniformsData.r.index}_${uniformsData.g.index}_${uniformsData.b.index}_${rMin}_${rMax}_${gMin}_${gMax}_${bMin}_${bMax}_t${timeIdx}`;
	}
};

const syncTemporalRasterVisualizationRange = (entry: RasterImageEntry<RasterTiffStyle>) => {
	const dataRanges = GeoTiffCache.getDataRanges(entry.id);
	if (!dataRanges || dataRanges.length === 0) return;

	if (entry.style.visualization.mode === 'single') {
		const currentRange = dataRanges[0];
		if (!currentRange) return;
		entry.style.visualization.uniformsData.single.index = 0;
		entry.style.visualization.uniformsData.single.range = createAdjustableRange(
			currentRange.min,
			currentRange.max
		);
		return;
	}

	if (entry.style.visualization.mode === 'twi') {
		const currentRange = GeoTiffCache.getDataRanges(getTwiCacheKey(entry.id))?.[0];
		if (!currentRange) return;
		entry.style.visualization.uniformsData.twi = {
			colorMap: entry.style.visualization.uniformsData.twi?.colorMap ?? 'hsv',
			range: createAdjustableRange(currentRange.min, currentRange.max)
		};
		return;
	}

	if (
		entry.style.visualization.mode === 'slope'
		|| entry.style.visualization.mode === 'aspect'
		|| entry.style.visualization.mode === 'tpi'
		|| entry.style.visualization.mode === 'topex'
	) {
		const mode = entry.style.visualization.mode;
		const currentRange = mode === 'slope'
			? { min: 0, max: 90 }
			: mode === 'aspect'
			? { min: 0, max: 360 }
			: mode === 'tpi'
			? { min: -1, max: 1 }
			: GeoTiffCache.getDataRanges(getTopexCacheKey(entry.id))?.[0];
		if (!currentRange) return;
		const current = entry.style.visualization.uniformsData[mode];
		entry.style.visualization.uniformsData[mode] = {
			colorMap: current?.colorMap
				?? (mode === 'slope' ? 'salinity' : mode === 'aspect' ? 'rainbow-soft' : 'rdbu'),
			range: createAdjustableRange(currentRange.min, currentRange.max)
		};
		return;
	}

	if (entry.style.visualization.mode === 'multi') {
		const uniforms = entry.style.visualization.uniformsData.multi;
		const nextRanges = [uniforms.r, uniforms.g, uniforms.b];
		nextRanges.forEach((uniform, index) => {
			const currentRange = dataRanges[index];
			if (!currentRange) return;
			uniform.range = createAdjustableRange(currentRange.min, currentRange.max);
		});
	}
};

export const getRasterTiffImageSource = async (
	entry: RasterImageEntry<RasterTiffStyle>,
	{ isCurrent = alwaysCurrent }: SourcePreparationOptions = {}
): Promise<ImageSourceSpecification | undefined> => {
	if (!isCurrent()) return;
	const timeIdx = getRasterDimensionCurrentIndex(entry) ?? -1;
	if (timeIdx >= 0 && NetCDFDataCache.has(entry.id)) {
		await NetCDFDataCache.updateTimeStep(entry.id, timeIdx);
		if (!isCurrent()) return;
		syncTemporalRasterVisualizationRange(entry);
	}

	if (entry.style.visualization.mode === 'twi' || entry.style.visualization.mode === 'topex') {
		const mode = entry.style.visualization.mode;
		const range = await ensureRasterDerivedCache(entry.id, mode);
		if (!range || !isCurrent()) return;
	}

	const styleID = getRasterTiffStyleId(entry);
	if (!styleID) return;

	let imageData: string | undefined;
	const cachedImage = GeoTiffImageCache.has(styleID);
	if (cachedImage) {
		imageData = GeoTiffImageCache.get(styleID);
	} else {
		imageData = await loadRasterData(entry.id, entry.style.visualization);
	}

	if (!imageData) return;
	if (!isCurrent()) {
		// この準備で生成した未採用URLだけを破棄し、現行styleのキャッシュは保持する。
		if (!cachedImage) URL.revokeObjectURL(imageData);
		return;
	}

	GeoTiffImageCache.set(styleID, imageData);
	GeoTiffImageCache.revokeOldEntries(entry.id, styleID);

	return {
		type: 'image',
		url: imageData,
		coordinates: entry.metaData.imageCorners ?? getBoundingBoxCorners(entry.metaData.bounds)
	} satisfies ImageSourceSpecification;
};

/** 通信と描画キャッシュの準備。spec生成に必要な値を確定して返す。 */
export const prepareSourceData = async (
	entries: MorivisLayerEntry[],
	{ isCurrent = alwaysCurrent }: SourcePreparationOptions = {}
): Promise<PreparedSourceData> => {
	const results = await Promise.all(entries.map(async (entry) => {
		const result: PreparedSourceData[string] = {};
		if (!isCurrent()) return [entry.id, result] as const;
		if (entry.format.type === 'pmtiles') {
			result.requestUrl = resolveRequestUrl(entry.format.url);
		}
		if (entry.type === 'vector') {
			if (entry.format.type === 'geojson' || entry.format.type === 'fgb') {
				result.geojson = GeojsonCache.get(entry.id);
				if (!result.geojson) {
					result.geojson = entry.format.type === 'fgb'
						? await getFgbToGeojson(entry.format.url)
						: await getGeojson(entry.format.url);
					if (isCurrent()) GeojsonCache.set(entry.id, result.geojson);
				}
			}
			if (
				isCurrent() && entry.format.type === 'geojsontile' && entry.properties.joinDataUrl
			) {
				const response = await fetch(entry.properties.joinDataUrl);
				if (!response.ok) throw new Error(`Join data request failed: ${response.status}`);
				const joinData = await response.json();
				if (isCurrent()) JoinDataCache.set(entry.id, joinData);
			}
		}
		if (entry.type === 'raster') {
			if (entry.format.type === 'image' && entry.style.type === 'tiff') {
				const currentIndex = getRasterDimensionCurrentIndex(entry);
				const before = currentIndex !== undefined && NetCDFDataCache.has(entry.id)
					? structuredClone(entry.style.visualization)
					: undefined;
				result.image = await getRasterTiffImageSource(
					entry as RasterImageEntry<RasterTiffStyle>,
					{ isCurrent }
				);
				if (
					isCurrent() && before && currentIndex !== undefined
					&& JSON.stringify(before) !== JSON.stringify(entry.style.visualization)
				) {
					result.rasterVisualizationUpdate = {
						entryId: entry.id,
						currentIndex,
						before,
						after: structuredClone(entry.style.visualization)
					};
				}
			}
			if (entry.format.type === 'cog') {
				const metadata = CogTileManager.getMetadata(entry.id);
				result.cogTileSize = metadata?.tileSize;
				result.cogMinZoom = metadata?.minZoom;
				result.cogMaxZoom = metadata?.maxZoom;
			}
		}
		return [entry.id, result] as const;
	}));
	return Object.fromEntries(results);
};
