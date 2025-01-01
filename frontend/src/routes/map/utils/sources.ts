import type {
	SourceSpecification,
	VectorSourceSpecification,
	RasterSourceSpecification,
	GeoJSONSourceSpecification
} from 'maplibre-gl';

import type { GeoDataEntry } from '../data';
import { geojson as fgb } from 'flatgeobuf';

export const createSourcesItems = async (
	_dataEntries: GeoDataEntry
): Promise<{ [_: string]: SourceSpecification }> => {
	const sourceItemsArray = await Promise.all(
		Object.entries(_dataEntries).map(async ([id, data]) => {
			const items: { [_: string]: SourceSpecification } = {};
			const sourceId = `${id}_source`;
			const { metaData, format, type } = data;

			switch (type) {
				case 'raster': {
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
					break;
				}
				case 'vector': {
					if (format.type === 'geojson') {
						const geojsonSource: GeoJSONSourceSpecification = {
							type: 'geojson',
							data: format.url,
							generateId: true,
							attribution: metaData.attribution
						};
						items[sourceId] = geojsonSource;
					} else if (format.type === 'mvt') {
						const vectorSource: VectorSourceSpecification = {
							type: 'vector',
							tiles: [format.url],
							maxzoom: metaData.maxZoom,
							minzoom: metaData.minZoom,
							attribution: metaData.attribution,
							bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
						};
						items[sourceId] = vectorSource;
					} else if (format.type === 'fgb') {
						const response = await fetch(format.url);
						const featureIterator = fgb.deserialize(response.body as ReadableStream);

						const geojson: GeoJSON.GeoJSON = {
							type: 'FeatureCollection',
							features: []
						};
						for await (const feature of featureIterator) {
							geojson.features.push(feature);
						}

						const geojsonSource: GeoJSONSourceSpecification = {
							type: 'geojson',
							data: geojson,
							generateId: true,
							attribution: metaData.attribution
						};
						items[sourceId] = geojsonSource;
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

	console.log(sourceItems);

	return sourceItems;
};
