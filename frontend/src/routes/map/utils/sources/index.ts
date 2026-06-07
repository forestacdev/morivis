import {
	type SourceSpecification,
	type VectorSourceSpecification,
	type RasterSourceSpecification,
	type GeoJSONSourceSpecification,
	type ImageSourceSpecification,
	type RasterDEMSourceSpecification
} from 'maplibre-gl';

import type {
	DemRangeColorStyle,
	DerivedBandData,
	RasterEntry,
	RasterDemStyle
} from '$routes/map/data/types/raster';
import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';

import {
	type GeoDataEntry,
	createAdjustableRange,
	getAdjustableRangeValue
} from '$routes/map/data/types';
import {
	showLabelLayer,
	showBoundaryLayer,
	showRoadLayer,
	selectedBaseMap,
	showCloudLayer
} from '$routes/stores/layers';

import { labelSources } from '$routes/map/utils/layers/label';
import { roadSources } from '$routes/map/utils/layers/road';
import { boundarySources } from '$routes/map/utils/layers/boundary';
import { cloudSources } from '$routes/map/utils/layers/cloud';
import {
	baseMapSatelliteSources,
	baseMapOsmSources,
	baseMapReliefSources,
	baseMapSlopeSources,
	baseMapAspectSources,
	baseMapCurvatureSources
} from '$routes/map/utils/layers/base_map';
import { get } from 'svelte/store';

import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { JoinDataCache } from '$routes/map/utils/cache/join-data-cache';
import { GeoTiffCache, GeoTiffImageCache } from '$routes/map/utils/cache/raster/geotiff-cache';
import { getGeojson } from '$routes/map/utils/formats/geojson';
import { getFgbToGeojson } from '$routes/map/utils/formats/geojson';
import { resolveRequestUrl } from '$routes/map/utils/platform/request';

import { objectToUrlParams } from '$routes/map/utils/platform/url-params';

import { getBoundingBoxCorners } from '$routes/map/utils/map/bbox';
import {
	ensureRasterDerivedCache,
	getAspectCacheKey,
	getSlopeCacheKey,
	getTpiCacheKey,
	getTwiCacheKey,
	loadRasterData
} from '$routes/map/utils/formats/geotiff';
import { CogTileManager } from '$routes/map/utils/formats/geotiff/cog_tile_manager';
import { NetCDFDataCache } from '$routes/map/utils/formats/netcdf/cache';
import type { FeatureCollection } from '$routes/map/types/geojson';
import {
	replaceDimensionPlaceholder,
	resolveDimensionPlaceholders
} from '$routes/map/utils/dimension';
import {
	getRasterDimension,
	getRasterDimensionCurrentIndex,
	getRasterDimensionValue
} from '$routes/map/utils/raster/dimension-runtime';
import { getDemStyleRange, isDemStepColorStyle } from '$routes/map/utils/style/color-mapping';

const EMPTY_IMAGE_DATA_URL =
	'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const detectTileScheme = (url: string): 'tms' | 'xyz' => {
	return url.includes('{-y}') ? 'tms' : 'xyz';
};

const toDemStyleUrlParams = (style: DemRangeColorStyle): string => {
	const [min, max] = getDemStyleRange(style);
	const params = new URLSearchParams({
		type: isDemStepColorStyle(style) ? 'step' : 'linear',
		min: String(min),
		max: String(max)
	});

	if (isDemStepColorStyle(style)) {
		params.set('colorMap', style.colorMap);
		params.set('divisions', String(style.divisions));
	} else {
		params.set('colorMap', style.colorMap);
	}

	return params.toString();
};

const getRasterDerivedDefaultStyle = (
	mode: 'twi' | 'slope' | 'aspect' | 'tpi',
	range?: { min: number; max: number }
): DerivedBandData => {
	return {
		colorMap:
			mode === 'twi'
				? 'hsv'
				: mode === 'slope'
					? 'salinity'
					: mode === 'aspect'
						? 'rainbow-soft'
						: 'rdbu',
		range: createAdjustableRange(
			range?.min ?? (mode === 'aspect' ? 0 : mode === 'slope' ? 0 : -1),
			range?.max ?? (mode === 'aspect' ? 360 : mode === 'slope' ? 90 : 1)
		)
	};
};

export const convertTmsToXyz = (url: string): string => {
	return url.replace('{-y}', '{y}');
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
		const uniformsData =
			visualization.uniformsData.twi ??
			getRasterDerivedDefaultStyle(
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

	if (mode === 'slope' || mode === 'aspect' || mode === 'tpi') {
		const cacheKey =
			mode === 'slope'
				? getSlopeCacheKey(entry.id)
				: mode === 'aspect'
					? getAspectCacheKey(entry.id)
					: getTpiCacheKey(entry.id);
		const uniformsData =
			visualization.uniformsData[mode] ??
			getRasterDerivedDefaultStyle(mode, GeoTiffCache.getDataRanges(cacheKey)?.[0]);
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
		entry.style.visualization.mode === 'slope' ||
		entry.style.visualization.mode === 'aspect' ||
		entry.style.visualization.mode === 'tpi'
	) {
		const mode = entry.style.visualization.mode;
		const cacheKey =
			mode === 'slope'
				? getSlopeCacheKey(entry.id)
				: mode === 'aspect'
					? getAspectCacheKey(entry.id)
					: getTpiCacheKey(entry.id);
		const currentRange = GeoTiffCache.getDataRanges(cacheKey)?.[0];
		if (!currentRange) return;
		const current = entry.style.visualization.uniformsData[mode];
		entry.style.visualization.uniformsData[mode] = {
			colorMap:
				current?.colorMap ??
				(mode === 'slope' ? 'salinity' : mode === 'aspect' ? 'rainbow-soft' : 'rdbu'),
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
	entry: RasterImageEntry<RasterTiffStyle>
): Promise<ImageSourceSpecification | undefined> => {
	const timeIdx = getRasterDimensionCurrentIndex(entry) ?? -1;
	if (timeIdx >= 0 && NetCDFDataCache.has(entry.id)) {
		await NetCDFDataCache.updateTimeStep(entry.id, timeIdx);
		syncTemporalRasterVisualizationRange(entry);
	}

	if (
		entry.style.visualization.mode === 'twi' ||
		entry.style.visualization.mode === 'slope' ||
		entry.style.visualization.mode === 'aspect' ||
		entry.style.visualization.mode === 'tpi'
	) {
		const mode = entry.style.visualization.mode;
		const range = await ensureRasterDerivedCache(entry.id, mode);
		if (!range) return;
	}

	const styleID = getRasterTiffStyleId(entry);
	if (!styleID) return;

	let imageData: string | undefined;
	if (GeoTiffImageCache.has(styleID)) {
		imageData = GeoTiffImageCache.get(styleID);
	} else {
		imageData = await loadRasterData(entry.id, entry.style.visualization);
	}

	if (!imageData) return;

	GeoTiffImageCache.set(styleID, imageData);
	GeoTiffImageCache.revokeOldEntries(entry.id, styleID);

	return {
		type: 'image',
		url: imageData,
		coordinates: entry.metaData.imageCorners ?? getBoundingBoxCorners(entry.metaData.bounds)
	} satisfies ImageSourceSpecification;
};

export const createSourcesItems = async (
	_dataEntries: GeoDataEntry[],
	_type: 'main' | 'preview' = 'main'
): Promise<{ [_: string]: SourceSpecification }> => {
	// 各エントリの非同期処理結果を配列に格納
	const sourceItemsArray = await Promise.all(
		_dataEntries.map(async (entry, index) => {
			const items: { [_: string]: SourceSpecification } = {};
			const sourceId = `${entry.id}_source`;
			const { metaData, format, type, style } = entry;

			switch (type) {
				case 'raster': {
					if (format.type === 'image') {
						if (style.type === 'tiff') {
							const imageSource = await getRasterTiffImageSource(
								entry as RasterImageEntry<RasterTiffStyle>
							);
							if (imageSource) {
								items[sourceId] = imageSource;
							}
						} else if (style.type === 'dem') {
							const visualization = style.visualization;
							const mode = visualization.mode;
							if (
								mode === 'relief' ||
								mode === 'slope' ||
								mode === 'aspect' ||
								mode === 'curvature'
							) {
								const demType = visualization.demType;
								const uniformsDataParam =
									mode === 'relief'
										? toDemStyleUrlParams(visualization.uniformsData.relief)
										: mode === 'slope' && visualization.uniformsData.slope
											? toDemStyleUrlParams(visualization.uniformsData.slope)
											: objectToUrlParams(
													(mode === 'aspect'
														? visualization.uniformsData.aspect
														: visualization.uniformsData.curvature) as Record<string, unknown>
												);
								items[sourceId] = {
									type: 'raster',
									tiles: [
										`webgl://${format.url}?entryId=${entry.id}&formatType=${format.type}&demType=${demType}&mode=${mode}&${uniformsDataParam}&tileSize=${metaData.tileSize}&baseUrl=${encodeURIComponent(format.url)}&x={x}&y={y}&z={z}`
									],
									maxzoom: metaData.maxZoom,
									minzoom: metaData.minZoom,
									tileSize: metaData.tileSize,
									attribution: metaData.attribution,
									bounds: metaData.bounds
								} as RasterSourceSpecification;
							} else {
								items[sourceId] = {
									type: 'raster',
									tiles: [format.url],
									maxzoom: metaData.maxZoom,
									minzoom: metaData.minZoom,
									tileSize: metaData.tileSize,
									attribution: metaData.attribution,
									bounds: metaData.bounds
								} as RasterSourceSpecification;
							}
						} else {
							let tileUrl = convertTmsToXyz(format.url);
							if (getRasterDimension(entry)) {
								const timeValue = getRasterDimensionValue(entry);
								if (timeValue) {
									tileUrl = replaceDimensionPlaceholder(tileUrl, timeValue);
								}
							}
							items[sourceId] = {
								type: 'raster',
								tiles: [tileUrl],
								maxzoom: metaData.maxZoom,
								minzoom: metaData.minZoom,
								scheme: detectTileScheme(format.url),
								tileSize: metaData.tileSize,
								attribution: metaData.attribution,
								bounds: metaData.bounds
							} as RasterSourceSpecification;
						}
					} else if (format.type === 'pmtiles') {
						const pmtilesUrl = resolveRequestUrl(format.url);
						if (style.type === 'dem') {
							const visualization = style.visualization;
							const mode = visualization.mode;
							if (
								mode === 'relief' ||
								mode === 'slope' ||
								mode === 'aspect' ||
								mode === 'curvature'
							) {
								const demType = visualization.demType;
								const uniformsDataParam =
									mode === 'relief'
										? toDemStyleUrlParams(visualization.uniformsData.relief)
										: mode === 'slope' && visualization.uniformsData.slope
											? toDemStyleUrlParams(visualization.uniformsData.slope)
											: objectToUrlParams(
													(mode === 'aspect'
														? visualization.uniformsData.aspect
														: visualization.uniformsData.curvature) as Record<string, unknown>
												);

								items[sourceId] = {
									type: 'raster',
									tiles: [
										`webgl://${pmtilesUrl}?entryId=${entry.id}&formatType=${format.type}&demType=${demType}&mode=${mode}&${uniformsDataParam}&tileSize=${metaData.tileSize}&baseUrl=${encodeURIComponent(pmtilesUrl)}&x={x}&y={y}&z={z}`
									],
									maxzoom: metaData.maxZoom,
									minzoom: metaData.minZoom,
									tileSize: metaData.tileSize,
									attribution: metaData.attribution,
									bounds: metaData.bounds
								} as RasterSourceSpecification;
							} else {
								items[sourceId] = {
									type: 'raster',
									url: `pmtiles://${pmtilesUrl}`,
									maxzoom: metaData.maxZoom,
									minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
									tileSize: metaData.tileSize,
									attribution: metaData.attribution,
									bounds: metaData.bounds
								} as RasterSourceSpecification;
							}
						} else if (style.type === 'cad') {
							items[sourceId] = {
								type: 'raster',
								url: `pmtiles://${pmtilesUrl}`,
								maxzoom: metaData.maxZoom,
								minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
								tileSize: metaData.tileSize,
								attribution: metaData.attribution,
								bounds: metaData.bounds
							} as RasterSourceSpecification;
						} else {
							items[sourceId] = {
								type: 'raster',
								url: `pmtiles://${pmtilesUrl}`,
								maxzoom: metaData.maxZoom,
								minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
								tileSize: metaData.tileSize,
								attribution: metaData.attribution,
								bounds: metaData.bounds
							} as RasterSourceSpecification;
						}
					} else if (format.type === 'mbtiles') {
						items[sourceId] = {
							type: 'raster',
							tiles: [format.url],
							maxzoom: metaData.maxZoom,
							minzoom: metaData.minZoom,
							tileSize: metaData.tileSize,
							attribution: metaData.attribution,
							bounds: metaData.bounds
						} as RasterSourceSpecification;
					} else if (format.type === 'cog') {
						if (style.type === 'tiff') {
							if (format.mode !== 'tile') {
								items[sourceId] = {
									type: 'image',
									url: EMPTY_IMAGE_DATA_URL,
									coordinates: getBoundingBoxCorners(metaData.bounds)
								} satisfies ImageSourceSpecification;
								break;
							}

							const cogMeta = CogTileManager.getMetadata(entry.id);
							const tileSize = cogMeta?.tileSize ?? metaData.tileSize;
							const visualization = style.visualization;
							const mode = visualization.mode;
							let tileUrl: string;

							if (mode === 'single') {
								const u = visualization.uniformsData.single;
								const [uMin, uMax] = getAdjustableRangeValue(u.range, u.min, u.max);
								tileUrl = `cog://tile?entryId=${entry.id}&mode=single&bandIndex=${u.index}&colorMap=${u.colorMap}&min=${uMin}&max=${uMax}&tileSize=${tileSize}&x={x}&y={y}&z={z}`;
							} else {
								const u = visualization.uniformsData.multi;
								const [rMin, rMax] = getAdjustableRangeValue(u.r.range, u.r.min, u.r.max);
								const [gMin, gMax] = getAdjustableRangeValue(u.g.range, u.g.min, u.g.max);
								const [bMin, bMax] = getAdjustableRangeValue(u.b.range, u.b.min, u.b.max);
								tileUrl = `cog://tile?entryId=${entry.id}&mode=multi&rIndex=${u.r.index}&gIndex=${u.g.index}&bIndex=${u.b.index}&rMin=${rMin}&rMax=${rMax}&gMin=${gMin}&gMax=${gMax}&bMin=${bMin}&bMax=${bMax}&tileSize=${tileSize}&x={x}&y={y}&z={z}`;
							}

							items[sourceId] = {
								type: 'raster',
								tiles: [tileUrl],
								maxzoom: cogMeta?.maxZoom ?? metaData.maxZoom,
								minzoom: cogMeta?.minZoom ?? metaData.minZoom,
								tileSize,
								attribution: metaData.attribution,
								bounds: metaData.bounds
							} as RasterSourceSpecification;
						}
					} else if (format.type === 'wcs') {
						items[sourceId] = {
							type: 'image',
							url: EMPTY_IMAGE_DATA_URL,
							coordinates: getBoundingBoxCorners(metaData.bounds)
						} satisfies ImageSourceSpecification;
					}
					break;
				}
				case 'vector': {
					if (format.type === 'geojson' || format.type === 'fgb') {
						let geojson: FeatureCollection | undefined;
						if (GeojsonCache.has(entry.id)) {
							geojson = GeojsonCache.get(entry.id);
						} else if (format.type === 'fgb') {
							geojson = await getFgbToGeojson(format.url);
							GeojsonCache.set(entry.id, geojson);
						} else if (format.type === 'geojson') {
							geojson = await getGeojson(format.url);
							GeojsonCache.set(entry.id, geojson);
						}

						items[sourceId] = {
							type: 'geojson',
							data: geojson,
							generateId: true,
							maxzoom: metaData.maxZoom,
							attribution: metaData.attribution,
							tolerance: 0.5
							// lineMetrics: true // ラインの長さをメートルで取得 重たい場合は削除
							// TODO: 線のグラデーションをする場合は以下を追加
						} as GeoJSONSourceSpecification;
					} else if (format.type === 'mvt') {
						items[sourceId] = {
							type: 'vector',
							tiles: [format.url],
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							promoteId: 'promoteId' in metaData ? metaData.promoteId : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds
						} as VectorSourceSpecification;
					} else if (format.type === 'pmtiles') {
						const pmtilesUrl = resolveRequestUrl(format.url);
						items[sourceId] = {
							type: 'vector',
							url: `pmtiles://${pmtilesUrl}`,
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							promoteId: 'promoteId' in metaData ? metaData.promoteId : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds
						} as VectorSourceSpecification;
					} else if (format.type === 'mbtiles') {
						items[sourceId] = {
							type: 'vector',
							tiles: [format.url],
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							promoteId: 'promoteId' in metaData ? metaData.promoteId : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds
						} as VectorSourceSpecification;
					} else if (format.type === 'geojsontile') {
						items[sourceId] = {
							type: 'vector',
							tiles: [`geojson://${format.url}?x={x}&y={y}&z={z}&entryId=${entry.id}`],
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							promoteId: 'promoteId' in metaData ? metaData.promoteId : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds
						} as VectorSourceSpecification;

						if ('joinDataUrl' in entry.properties && entry.properties.joinDataUrl) {
							const joinData = await fetch(entry.properties.joinDataUrl).then((res) => res.json());
							JoinDataCache.set(entry.id, joinData);
						}
					} else if (format.type === 'esri-feature') {
						items[sourceId] = {
							type: 'vector',
							tiles: [`esri-feature://${format.url}?x={x}&y={y}&z={z}`],
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds
						} as VectorSourceSpecification;
					} else if (format.type === 'ogc-feature') {
						const sourceLayer = 'sourceLayer' in metaData ? metaData.sourceLayer : 'geojsonLayer';
						items[sourceId] = {
							type: 'vector',
							tiles: [
								`ogc-feature://request?src=${encodeURIComponent(format.url)}&sourceLayer=${sourceLayer}&x={x}&y={y}&z={z}&entryId=${entry.id}`
							],
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							promoteId: 'promoteId' in metaData ? metaData.promoteId : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds
						} as VectorSourceSpecification;
					} else if (format.type === 'wfs-feature') {
						const sourceLayer = 'sourceLayer' in metaData ? metaData.sourceLayer : 'geojsonLayer';
						const version = 'version' in entry.metaData ? String(entry.metaData.version ?? '') : '';
						const outputFormat =
							'outputFormat' in entry.metaData
								? String(entry.metaData.outputFormat ?? 'application/json')
								: 'application/json';
						const requestQuery = [
							`serviceUrl=${encodeURIComponent(format.url)}`,
							`version=${encodeURIComponent(version)}`,
							`typeName=${encodeURIComponent('sourceLayer' in metaData ? metaData.sourceLayer : 'geojsonLayer')}`,
							`outputFormat=${encodeURIComponent(outputFormat)}`,
							`srsName=${encodeURIComponent('EPSG:4326')}`,
							`sourceLayer=${encodeURIComponent(sourceLayer)}`,
							'x={x}',
							'y={y}',
							'z={z}',
							`entryId=${encodeURIComponent(entry.id)}`
						].join('&');

						items[sourceId] = {
							type: 'vector',
							tiles: [`wfs-feature://request?${requestQuery}`],
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							promoteId: 'promoteId' in metaData ? metaData.promoteId : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds
						} as VectorSourceSpecification;
					}
					break;
				}
				default:
					console.warn(`Unknown layer: ${sourceId}`);
					break;
			}

			if ('auxiliaryLayers' in entry && entry.auxiliaryLayers && entry.auxiliaryLayers.sources) {
				const { sources } = entry.auxiliaryLayers;
				const dimensionValue = getRasterDimensionValue(entry);

				Object.entries(sources).forEach(([auxiliarySourceId, auxiliarySource]) => {
					const sourceKey = `${auxiliarySourceId}`;
					items[sourceKey] = resolveDimensionPlaceholders(
						auxiliarySource,
						dimensionValue
					) as SourceSpecification;
				});
			}
			return { index, items }; // インデックスを含めて返す
		})
	);

	// インデックス順に並び替え
	const sortedItems = sourceItemsArray
		.sort((a, b) => a.index - b.index) // インデックス順にソート
		.map((item) => {
			return item.items;
		}); // items だけを抽出

	// 配列をオブジェクトに統合
	const sourceItems = Object.assign({}, ...sortedItems);

	// ベースマップ
	let baseSourcesItem;
	if (get(selectedBaseMap) === 'satellite') {
		baseSourcesItem = baseMapSatelliteSources;
	} else if (get(selectedBaseMap) === 'relief') {
		baseSourcesItem = baseMapReliefSources;
	} else if (get(selectedBaseMap) === 'slope') {
		// TODO: 共通化
		baseSourcesItem = baseMapSlopeSources;
	} else if (get(selectedBaseMap) === 'aspect') {
		// TODO: 共通化
		baseSourcesItem = baseMapAspectSources;
	} else if (get(selectedBaseMap) === 'curvature') {
		baseSourcesItem = baseMapCurvatureSources;
	} else if (get(selectedBaseMap) === 'osm') {
		baseSourcesItem = baseMapOsmSources;
	} else {
		baseSourcesItem = {};
	}

	const labelSourcesItem = get(showLabelLayer) ? labelSources : {};
	const roadSourcesItem = get(showRoadLayer) ? roadSources : {};
	const boundarySourcesItem = get(showBoundaryLayer) ? boundarySources : {};
	const cloudSourcesItem = get(showCloudLayer) ? cloudSources : {};

	return {
		...sourceItems,
		...baseSourcesItem,
		...labelSourcesItem,
		...roadSourcesItem,
		...boundarySourcesItem,
		...cloudSourcesItem
	} as {
		[_: string]: SourceSpecification;
	};
};

export const createTerrainSources = async (
	_dataEntries: RasterEntry<RasterDemStyle>[],
	_id: string
): Promise<{ [_: string]: RasterDEMSourceSpecification }> => {
	const sourceItems: { [_: string]: RasterDEMSourceSpecification } = {};

	const entry = _dataEntries.find((e) => e.id === _id);

	if (!entry) {
		console.warn(`Entry with id ${_id} not found.`);
		return sourceItems;
	}

	const { id, metaData, format, style } = entry;
	const demType = style.visualization.demType;

	sourceItems['terrain'] = {
		type: 'raster-dem',
		tiles: [
			`terrain://${format.url}?entryId=${id}&formatType=${format.type}&demType=${demType}&tileSize=${metaData.tileSize}&baseUrl=${encodeURIComponent(format.url)}&x={x}&y={y}&z={z}`
		],
		maxzoom: metaData.maxZoom,
		minzoom: metaData.minZoom,
		tileSize: metaData.tileSize,
		attribution: metaData.attribution,
		bounds: metaData.bounds
	};

	return sourceItems;
};
