import type { SymbolLayerSpecification, SourceSpecification } from 'maplibre-gl';
import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';

const LAYER_BASE = {
	source: 'poi',
	type: 'symbol',
	minzoom: 11,
	layout: {
		'icon-image': 'poi-icon', // アイコンの画像名
		'icon-size': 3 // アイコンのサイズ
	}
} as const;

export const poiStyleJson = {
	sources: {
		poi: {
			type: 'vector',
			url: `pmtiles://${ENTRY_PMTILES_VECTOR_PATH}/fac_search.pmtiles`,
			maxzoom: 14,
			minzoom: 1,
			bounds: [-180, -85.051129, 180, 85.051129]
		} as SourceSpecification,
		fac_top: {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						properties: {
							name: '森林文化アカデミー',
							image: './mapicon.png',
							_prop_id: 'fac_top'
						},
						geometry: {
							type: 'Point',
							coordinates: [136.918564, 35.554467]
						}
					}
				]
			}
		}
	},
	layers: [
		{
			id: 'fac_poi_layer',
			'source-layer': 'fac_poi',
			...LAYER_BASE
		} as SymbolLayerSpecification
	]
};

export const poiLayersIds = poiStyleJson.layers.map((layer) => layer.id);
