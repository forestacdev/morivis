import type {
	SourceSpecification,
	VectorSourceSpecification,
	RasterSourceSpecification,
	GeoJSONSourceSpecification
} from 'maplibre-gl';

import type { GeoDataEntry } from '../data';

export const createSourcesItems = (_dataEntries: GeoDataEntry) => {
	const sourceItems: { [_: string]: SourceSpecification } = {};

	Object.entries(_dataEntries).forEach(([id, data]) => {
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
				sourceItems[sourceId] = rasterSource;
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
					sourceItems[sourceId] = geojsonSource;
				} else if (format.type === 'mvt') {
					const VectorSource: VectorSourceSpecification = {
						type: 'vector',
						tiles: [format.url],
						maxzoom: metaData.maxZoom,
						minzoom: metaData.minZoom,
						attribution: metaData.attribution,
						bounds: metaData.bounds ?? [-180, -85.051129, 180, 85.051129]
					};

					sourceItems[sourceId] = VectorSource;
				}

				break;
			}
			default:
				console.warn(`Unknown layer: ${sourceId}`);
				break;
		}
	});

	console.log(sourceItems);

	return sourceItems;
};
