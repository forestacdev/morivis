import {
	type SourceSpecification,
	type VectorSourceSpecification,
	type RasterSourceSpecification,
	type GeoJSONSourceSpecification,
	type ImageSourceSpecification,
	type RasterDEMSourceSpecification
} from 'maplibre-gl';

import { TileImageManager } from '$routes/map/protocol/image';

import type { RasterEntry, RasterDemStyle } from '$routes/map/data/types/raster';

import type { GeoDataEntry } from '$routes/map/data/types';
import {
	showLabelLayer,
	showPoiLayer,
	showBoundaryLayer,
	showRoadLayer,
	selectedBaseMap
} from '$routes/stores/layers';

import { poiSources } from '$routes/map/utils/layers/poi';
import { labelSources } from '$routes/map/utils/layers/label';
import { roadSources } from '$routes/map/utils/layers/road';
import { boundarySources } from '$routes/map/utils/layers/boundary';
import { cloudSources } from '$routes/map/utils/layers/cloud';
import {
	baseMapSatelliteSources,
	baseMaphillshadeSources,
	baseMapOsmSources
} from '$routes/map/utils/layers/base_map';
import { get } from 'svelte/store';

import { GeojsonCache, getGeojson } from '$routes/map/utils/file/geojson';
import { getFgbToGeojson } from '$routes/map/utils/file/geojson';

import { objectToUrlParams } from '$routes/map/utils/params';

import { getBoundingBoxCorners } from '$routes/map/utils/map';
import { loadRasterData, GeoTiffImageCache } from '$routes/map/utils/file/geotiff';
import { ENTRY_TIFF_DATA_PATH } from '$routes/constants';

const detectTileScheme = (url: string): 'tms' | 'xyz' => {
	return url.includes('{-y}') ? 'tms' : 'xyz';
};

export const convertTmsToXyz = (url: string): string => {
	return url.replace('{-y}', '{y}');
};

const demUrlCache = TileImageManager.getInstance();

export const createSourcesItems = async (
	_dataEntries: GeoDataEntry[],
	_type: 'main' | 'preview' = 'main'
): Promise<{ [_: string]: SourceSpecification }> => {
	// 各エントリの非同期処理結果を配列に格納
	const sourceItemsArray = await Promise.all(
		_dataEntries.map(async (entry, index) => {
			const items: { [_: string]: SourceSpecification } = {};
			const sourceId = `${entry.id}_source`;
			const { metaData, format, type, style, auxiliaryLayers } = entry;

			switch (type) {
				case 'raster': {
					if (format.type === 'image') {
						if (style.type === 'tiff') {
							const visualization = style.visualization;
							const mode = visualization.mode;

							let styleID;
							if (mode === 'single') {
								const uniformsData = visualization.uniformsData[mode];
								styleID = `${entry.id}_${mode}_${uniformsData.index}_${uniformsData.colorMap}_${uniformsData.min}_${uniformsData.max}`;
							} else if (mode === 'multi') {
								const uniformsData = visualization.uniformsData[mode];
								styleID = `${entry.id}_${mode}_${uniformsData.r.index}_${uniformsData.g.index}_${uniformsData.b.index}`;
							}

							let imageData: string | undefined;
							if (GeoTiffImageCache.has(styleID as string)) {
								imageData = GeoTiffImageCache.get(styleID as string);
							} else {
								imageData = await loadRasterData(entry.id, format.url, visualization);
							}

							if (imageData) {
								GeoTiffImageCache.set(styleID as string, imageData);

								items[sourceId] = {
									type: 'image',
									url: imageData,
									coordinates: getBoundingBoxCorners(metaData.bounds)
								} as ImageSourceSpecification;
							}
						} else if (style.type === 'dem') {
							const visualization = style.visualization;
							const mode = visualization.mode;
							if (mode !== 'default') {
								const demType = visualization.demType;
								const uniformsDataParam = objectToUrlParams(visualization.uniformsData[mode]);
								demUrlCache.addUrlcache(entry.id, format.url); // TODO 消す処理

								items[sourceId] = {
									type: 'raster',
									tiles: [
										`webgl://${format.url}?entryId=${entry.id}&formatType=${format.type}&demType=${demType}&mode=${mode}&${uniformsDataParam}&x={x}&y={y}&z={z}`
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
							items[sourceId] = {
								type: 'raster',
								tiles: [convertTmsToXyz(format.url)],
								maxzoom: metaData.maxZoom,
								minzoom: metaData.minZoom,
								scheme: detectTileScheme(format.url),
								tileSize: metaData.tileSize,
								attribution: metaData.attribution,
								bounds: metaData.bounds
							} as RasterSourceSpecification;
						}
					} else if (format.type === 'pmtiles') {
						if (style.type === 'dem') {
							const visualization = style.visualization;
							const mode = visualization.mode;
							if (mode !== 'default') {
								const demType = visualization.demType;
								const uniformsDataParam = objectToUrlParams(visualization.uniformsData[mode]);

								items[sourceId] = {
									type: 'raster',
									tiles: [
										`webgl://${format.url}?entryId=${entry.id}&formatType=${format.type}&demType=${demType}&mode=${mode}&${uniformsDataParam}&x={x}&y={y}&z={z}`
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
									url: `pmtiles://${format.url}`,
									maxzoom: metaData.maxZoom,
									minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
									tileSize: metaData.tileSize,
									attribution: metaData.attribution,
									bounds: metaData.bounds
								} as RasterSourceSpecification;
							}
						} else {
							items[sourceId] = {
								type: 'raster',
								url: `pmtiles://${format.url}`,
								maxzoom: metaData.maxZoom,
								minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
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
						let geojson: GeoJSON.GeoJSON | undefined;
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
							attribution: metaData.attribution

							// lineMetrics: true // ラインの長さをメートルで取得 重たい場合は削除
							// tolerance: 1.5 // ピクセル単位で許容誤差を増加
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
						items[sourceId] = {
							type: 'vector',
							url: `pmtiles://${format.url}`,
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

			if (auxiliaryLayers) {
				const { source } = auxiliaryLayers;

				Object.entries(source).forEach(([auxiliarySourceId, auxiliarySource]) => {
					const sourceKey = `${auxiliarySourceId}`;
					items[sourceKey] = auxiliarySource as SourceSpecification;
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
	} else if (get(selectedBaseMap) === 'hillshade') {
		baseSourcesItem = baseMaphillshadeSources;
	} else if (get(selectedBaseMap) === 'hillshade') {
		baseSourcesItem = baseMaphillshadeSources;
	} else if (get(selectedBaseMap) === 'osm') {
		baseSourcesItem = baseMapOsmSources;
	} else {
		baseSourcesItem = {};
	}

	const poiSourcesItem = get(showPoiLayer) ? poiSources : {};
	const labelSourcesItem = get(showLabelLayer) ? labelSources : {};
	const roadSourcesItem = get(showRoadLayer) ? roadSources : {};
	const boundarySourcesItem = get(showBoundaryLayer) ? boundarySources : {};

	return {
		...sourceItems,
		...baseSourcesItem,
		...poiSourcesItem,
		...labelSourcesItem,
		...roadSourcesItem,
		...boundarySourcesItem,
		...cloudSources
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
			`terrain://${format.url}?entryId=${id}&formatType=${format.type}&demType=${demType}&x={x}&y={y}&z={z}`
		],
		maxzoom: metaData.maxZoom,
		minzoom: metaData.minZoom,
		tileSize: metaData.tileSize,
		attribution: metaData.attribution,
		bounds: metaData.bounds
	};

	return sourceItems;
};
