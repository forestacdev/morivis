import {
	type SourceSpecification,
	type VectorSourceSpecification,
	type RasterSourceSpecification,
	type GeoJSONSourceSpecification
} from 'maplibre-gl';

import type { GeoDataEntry } from '$map/data/types';

import { GeojsonCache, getGeojson } from '$map/utils/geojson';
import { getFgbToGeojson } from '$map/utils/geojson';

export const createSourcesItems = async (
	_dataEntries: GeoDataEntry[]
): Promise<{ [_: string]: SourceSpecification }> => {
	const sourceItemsArray = await Promise.all(
		_dataEntries.map(async (entry) => {
			const items: { [_: string]: SourceSpecification } = {};
			const sourceId = `${entry.id}_source`;
			const { metaData, format, type } = entry;
			// const boundingBox = fgbBoundingBox();

			switch (type) {
				case 'raster': {
					if (format.type === 'image') {
						const rasterSource: RasterSourceSpecification = {
							type: 'raster',
							tiles: [format.url],
							maxzoom: metaData.maxZoom,
							minzoom: metaData.minZoom,
							tileSize: 256,
							attribution: metaData.attribution,
							bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
						};
						items[sourceId] = rasterSource;
					} else if (format.type === 'pmtiles') {
						const vectorSource: RasterSourceSpecification = {
							type: 'raster',
							url: `pmtiles://${format.url}`,
							maxzoom: metaData.maxZoom,
							tileSize: 512,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
						};

						items[sourceId] = vectorSource;
					}
					break;
				}
				case 'vector': {
					if (format.type === 'geojson' || format.type === 'fgb') {
						let geojson: GeoJSON.GeoJSON | string = '';
						if (GeojsonCache.has(entry.id)) {
							geojson = GeojsonCache.get(entry.id);
						} else if (format.type === 'fgb') {
							geojson = await getFgbToGeojson(format.url);
							if (!GeojsonCache.has(entry.id)) GeojsonCache.set(entry.id, geojson);
						} else if (format.type === 'geojson') {
							geojson = await getGeojson(format.url);
							if (!GeojsonCache.has(entry.id)) GeojsonCache.set(entry.id, geojson);
						}

						const geojsonSource: GeoJSONSourceSpecification = {
							type: 'geojson',
							data: geojson,
							generateId: true,
							maxzoom: metaData.maxZoom,
							attribution: metaData.attribution
							// lineMetrics: true // ラインの長さをメートルで取得 重たい場合は削除
							// tolerance: 1.5 // ピクセル単位で許容誤差を増加
						};
						items[sourceId] = geojsonSource;
						if (!GeojsonCache.has(entry.id)) GeojsonCache.set(entry.id, geojson);
					} else if (format.type === 'mvt') {
						const vectorSource: VectorSourceSpecification = {
							type: 'vector',
							tiles: [format.url],
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
						};
						items[sourceId] = vectorSource;
					} else if (format.type === 'pmtiles') {
						const vectorSource: VectorSourceSpecification = {
							type: 'vector',
							url: `pmtiles://${format.url}`,
							maxzoom: metaData.maxZoom,
							minzoom: 'minZoom' in metaData ? metaData.minZoom : undefined,
							attribution: metaData.attribution,
							bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
						};

						items[sourceId] = vectorSource;
					}
					break;
				}
				default:
					console.warn(`Unknown layer: ${sourceId}`);
					break;
			}

			return items;
		})
	);

	// 配列をオブジェクトに統合
	const sourceItems = Object.assign({}, ...sourceItemsArray);

	return sourceItems;
};
