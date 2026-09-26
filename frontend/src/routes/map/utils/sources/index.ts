import { getAdjustableRangeValue, type MorivisLayerEntry } from '$routes/map/data/types';
import type {
	DemRangeColorStyle,
	MorivisRasterEntry,
	RasterDemStyle
} from '$routes/map/data/types/raster';
import type { FeatureCollection } from '$routes/map/types/geojson';
import {
	replaceDimensionPlaceholder,
	resolveDimensionPlaceholders
} from '$routes/map/utils/dimension';
import { baseMapOsmSources, baseMapSatelliteSources } from '$routes/map/utils/layers/base_map';
import { getBoundingBoxCorners } from '$routes/map/utils/map/bbox';
import type {
	GeoJSONSourceSpecification,
	ImageSourceSpecification,
	RasterDEMSourceSpecification,
	RasterSourceSpecification,
	SourceSpecification,
	VectorSourceSpecification
} from '$routes/map/utils/maplibre';
import { objectToUrlParams } from '$routes/map/utils/platform/serialize-params';
import {
	getRasterDimension,
	getRasterDimensionValue
} from '$routes/map/utils/raster/dimension-runtime';
import { getDemStyleRange, isDemStepColorStyle } from '$routes/map/utils/style/color-mapping';
import { normalizeDemShadowStyle } from '$routes/map/utils/style/dem-shadow';
import { getDemSlopeRangeMode } from '$routes/map/utils/style/dem-slope';
import type { BaseMapType } from '$routes/stores/layers';
import type { RasterVisualizationUpdate } from './raster-updates';
import { createVectorTileSource } from './vector-tiles';

const EMPTY_IMAGE_DATA_URL =
	'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const detectTileScheme = (url: string): 'tms' | 'xyz' => {
	return url.includes('{-y}') ? 'tms' : 'xyz';
};

const toDemStyleUrlParams = (style: DemRangeColorStyle, slopeAutoRange?: boolean): string => {
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

	if (slopeAutoRange !== undefined) params.set('slopeAutoRange', String(slopeAutoRange));
	return params.toString();
};

export const convertTmsToXyz = (url: string): string => url.replace('{-y}', '{y}');

export type PreparedSourceData = Readonly<
	Record<string, {
		geojson?: FeatureCollection;
		image?: ImageSourceSpecification;
		rasterVisualizationUpdate?: RasterVisualizationUpdate;
		cogTileSize?: number;
		cogMinZoom?: number;
		cogMaxZoom?: number;
		requestUrl?: string;
	}>
>;
export interface SourceGenerationInput {
	entries: MorivisLayerEntry[];
	prepared: PreparedSourceData;
	mode: 'main' | 'preview';
	baseMap: BaseMapType | null;
	referenceSources?: Record<string, VectorSourceSpecification>;
}

export const createSourcesItems = ({
	entries: _dataEntries,
	prepared,
	mode: _type,
	baseMap,
	referenceSources = {}
}: SourceGenerationInput): Record<string, SourceSpecification> => {
	const sourceItemsArray = _dataEntries.map((entry, index) => {
		const items: { [_: string]: SourceSpecification; } = {};
		const sourceId = `${entry.id}_source`;
		const { metaData, format, type, style } = entry;

		switch (type) {
			case 'raster': {
				if (format.type === 'image') {
					if (style.type === 'tiff') {
						const imageSource = prepared[entry.id]?.image;
						if (imageSource) {
							items[sourceId] = imageSource;
						}
					} else if (style.type === 'dem') {
						const visualization = style.visualization;
						const mode = visualization.mode;
						if (
							mode === 'relief'
							|| mode === 'slope'
							|| mode === 'aspect'
							|| mode === 'curvature'
							|| mode === 'shadow'
						) {
							const demType = visualization.demType;
							const uniformsDataParam = mode === 'relief'
								? toDemStyleUrlParams(visualization.uniformsData.relief)
								: mode === 'slope' && visualization.uniformsData.slope
								? toDemStyleUrlParams(
									visualization.uniformsData.slope,
									getDemSlopeRangeMode(visualization.uniformsData.slope)
										=== 'auto'
								)
								: mode === 'shadow'
								? objectToUrlParams({
									...normalizeDemShadowStyle(
										visualization.uniformsData.shadow
									)
								})
								: objectToUrlParams(
									(mode === 'aspect'
										? visualization.uniformsData.aspect
										: visualization.uniformsData.curvature) as Record<
											string,
											unknown
										>
								);
							items[sourceId] = {
								type: 'raster',
								tiles: [
									`webgl://${format.url}?entryId=${entry.id}&formatType=${format.type}&demType=${demType}&mode=${mode}&${uniformsDataParam}&tileSize=${metaData.tileSize}&baseUrl=${
										encodeURIComponent(
											format.url
										)
									}&x={x}&y={y}&z={z}`
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
					const pmtilesUrl = prepared[entry.id]?.requestUrl ?? format.url;
					if (style.type === 'dem') {
						const visualization = style.visualization;
						const mode = visualization.mode;
						if (
							mode === 'relief'
							|| mode === 'slope'
							|| mode === 'aspect'
							|| mode === 'curvature'
							|| mode === 'shadow'
						) {
							const demType = visualization.demType;
							const uniformsDataParam = mode === 'relief'
								? toDemStyleUrlParams(visualization.uniformsData.relief)
								: mode === 'slope' && visualization.uniformsData.slope
								? toDemStyleUrlParams(
									visualization.uniformsData.slope,
									getDemSlopeRangeMode(visualization.uniformsData.slope)
										=== 'auto'
								)
								: mode === 'shadow'
								? objectToUrlParams({
									...normalizeDemShadowStyle(
										visualization.uniformsData.shadow
									)
								})
								: objectToUrlParams(
									(mode === 'aspect'
										? visualization.uniformsData.aspect
										: visualization.uniformsData.curvature) as Record<
											string,
											unknown
										>
								);

							items[sourceId] = {
								type: 'raster',
								tiles: [
									`webgl://${pmtilesUrl}?entryId=${entry.id}&formatType=${format.type}&demType=${demType}&mode=${mode}&${uniformsDataParam}&tileSize=${metaData.tileSize}&baseUrl=${
										encodeURIComponent(
											pmtilesUrl
										)
									}&x={x}&y={y}&z={z}`
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

						const tileSize = prepared[entry.id]?.cogTileSize ?? metaData.tileSize;
						const visualization = style.visualization;
						const mode = visualization.mode;
						let tileUrl: string;

						if (mode === 'single') {
							const u = visualization.uniformsData.single;
							const [uMin, uMax] = getAdjustableRangeValue(u.range, u.min, u.max);
							tileUrl =
								`cog://tile?entryId=${entry.id}&mode=single&bandIndex=${u.index}&colorMap=${u.colorMap}&min=${uMin}&max=${uMax}&tileSize=${tileSize}&x={x}&y={y}&z={z}`;
						} else {
							const u = visualization.uniformsData.multi;
							const [rMin, rMax] = getAdjustableRangeValue(
								u.r.range,
								u.r.min,
								u.r.max
							);
							const [gMin, gMax] = getAdjustableRangeValue(
								u.g.range,
								u.g.min,
								u.g.max
							);
							const [bMin, bMax] = getAdjustableRangeValue(
								u.b.range,
								u.b.min,
								u.b.max
							);
							tileUrl =
								`cog://tile?entryId=${entry.id}&mode=multi&rIndex=${u.r.index}&gIndex=${u.g.index}&bIndex=${u.b.index}&rMin=${rMin}&rMax=${rMax}&gMin=${gMin}&gMax=${gMax}&bMin=${bMin}&bMax=${bMax}&tileSize=${tileSize}&x={x}&y={y}&z={z}`;
						}

						items[sourceId] = {
							type: 'raster',
							tiles: [tileUrl],
							maxzoom: prepared[entry.id]?.cogMaxZoom ?? metaData.maxZoom,
							minzoom: prepared[entry.id]?.cogMinZoom ?? metaData.minZoom,
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
				} else if (format.type === 'geozarr') {
					if (style.type === 'categorical' && style.legend.type === 'category') {
						const categoricalValues = entry.properties?.categories?.values.join('|')
							?? style.legend.labels.map((_, index) => index).join('|');
						const categoricalColors = style.legend.colors.join('|');
						const tileUrl =
							`geozarr://tile?entryId=${entry.id}&mode=categorical&bandIndex=0&values=${
								encodeURIComponent(
									categoricalValues
								)
							}&colors=${
								encodeURIComponent(
									categoricalColors
								)
							}&tileSize=${metaData.tileSize}&x={x}&y={y}&z={z}`;

						items[sourceId] = {
							type: 'raster',
							tiles: [tileUrl],
							maxzoom: metaData.maxZoom,
							minzoom: metaData.minZoom,
							tileSize: metaData.tileSize,
							attribution: metaData.attribution,
							bounds: metaData.bounds
						} as RasterSourceSpecification;
					} else if (style.type === 'tiff') {
						const visualization = style.visualization;
						const mode = visualization.mode;
						let tileUrl: string;

						if (mode === 'single') {
							const u = visualization.uniformsData.single;
							const [uMin, uMax] = getAdjustableRangeValue(u.range, u.min, u.max);
							tileUrl =
								`geozarr://tile?entryId=${entry.id}&mode=single&bandIndex=${u.index}&colorMap=${u.colorMap}&min=${uMin}&max=${uMax}&tileSize=${metaData.tileSize}&x={x}&y={y}&z={z}`;
						} else {
							const u = visualization.uniformsData.multi;
							const [rMin, rMax] = getAdjustableRangeValue(
								u.r.range,
								u.r.min,
								u.r.max
							);
							const [gMin, gMax] = getAdjustableRangeValue(
								u.g.range,
								u.g.min,
								u.g.max
							);
							const [bMin, bMax] = getAdjustableRangeValue(
								u.b.range,
								u.b.min,
								u.b.max
							);
							tileUrl =
								`geozarr://tile?entryId=${entry.id}&mode=multi&rIndex=${u.r.index}&gIndex=${u.g.index}&bIndex=${u.b.index}&rMin=${rMin}&rMax=${rMax}&gMin=${gMin}&gMax=${gMax}&bMin=${bMin}&bMax=${bMax}&tileSize=${metaData.tileSize}&x={x}&y={y}&z={z}`;
						}

						items[sourceId] = {
							type: 'raster',
							tiles: [tileUrl],
							maxzoom: metaData.maxZoom,
							minzoom: metaData.minZoom,
							tileSize: metaData.tileSize,
							attribution: metaData.attribution,
							bounds: metaData.bounds
						} as RasterSourceSpecification;
					}
				}
				break;
			}
			case 'vector': {
				if (format.type === 'geojson' || format.type === 'fgb') {
					const geojson = prepared[entry.id]?.geojson;

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
				} else if (format.type === 'mvt' || format.type === 'mlt') {
					items[sourceId] = createVectorTileSource(entry);
				} else if (format.type === 'pmtiles') {
					const pmtilesUrl = prepared[entry.id]?.requestUrl ?? format.url;
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
						tiles: [
							`geojson://${format.url}?x={x}&y={y}&z={z}&entryId=${entry.id}`
						],
						maxzoom: metaData.maxZoom,
						minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
						promoteId: 'promoteId' in metaData ? metaData.promoteId : undefined,
						attribution: metaData.attribution,
						bounds: metaData.bounds
					} as VectorSourceSpecification;
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
					const sourceLayer = 'sourceLayer' in metaData
						? metaData.sourceLayer
						: 'geojsonLayer';
					items[sourceId] = {
						type: 'vector',
						tiles: [
							`ogc-feature://request?src=${
								encodeURIComponent(
									format.url
								)
							}&sourceLayer=${sourceLayer}&x={x}&y={y}&z={z}&entryId=${entry.id}`
						],
						maxzoom: metaData.maxZoom,
						minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
						promoteId: 'promoteId' in metaData ? metaData.promoteId : undefined,
						attribution: metaData.attribution,
						bounds: metaData.bounds
					} as VectorSourceSpecification;
				} else if (format.type === 'wfs-feature') {
					const sourceLayer = 'sourceLayer' in metaData
						? metaData.sourceLayer
						: 'geojsonLayer';
					const version = 'version' in entry.metaData
						? String(entry.metaData.version ?? '')
						: '';
					const outputFormat = 'outputFormat' in entry.metaData
						? String(entry.metaData.outputFormat ?? 'application/json')
						: 'application/json';
					const requestQuery = [
						`serviceUrl=${encodeURIComponent(format.url)}`,
						`version=${encodeURIComponent(version)}`,
						`typeName=${
							encodeURIComponent(
								'sourceLayer' in metaData
									? metaData.sourceLayer
									: 'geojsonLayer'
							)
						}`,
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

		if (
			'auxiliaryLayers' in entry && entry.auxiliaryLayers && entry.auxiliaryLayers.sources
		) {
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
	});

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
	if (baseMap === 'satellite') {
		baseSourcesItem = baseMapSatelliteSources;
	} else if (baseMap === 'osm') {
		baseSourcesItem = baseMapOsmSources;
	} else {
		baseSourcesItem = {};
	}

	const referenceSourcesItem = _type === 'main' ? referenceSources : {};

	return {
		...sourceItems,
		...baseSourcesItem,
		...referenceSourcesItem
	} as {
		[_: string]: SourceSpecification;
	};
};

export const createTerrainSources = async (
	_dataEntries: MorivisRasterEntry<RasterDemStyle>[],
	_id: string
): Promise<{ [_: string]: RasterDEMSourceSpecification; }> => {
	const sourceItems: { [_: string]: RasterDEMSourceSpecification; } = {};

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
			`terrain://${format.url}?entryId=${id}&formatType=${format.type}&demType=${demType}&tileSize=${metaData.tileSize}&baseUrl=${
				encodeURIComponent(
					format.url
				)
			}&x={x}&y={y}&z={z}`
		],
		maxzoom: metaData.maxZoom,
		minzoom: metaData.minZoom,
		tileSize: metaData.tileSize,
		attribution: metaData.attribution,
		bounds: metaData.bounds
	};

	return sourceItems;
};
