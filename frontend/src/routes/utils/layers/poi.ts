import type { SymbolLayerSpecification, SourceSpecification } from 'maplibre-gl';
import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';

const LAYER_BASE = {
	source: 'poi',
	type: 'symbol',
	minzoom: 10,
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
		} as SourceSpecification
	},
	layers: [
		{
			id: 'poi_other_layer',
			'source-layer': 'fac_poi',
			...LAYER_BASE
		} as SymbolLayerSpecification,
		{
			id: 'poi_ziriki_layer',
			'source-layer': 'fac_ziriki_point',
			...LAYER_BASE
		} as SymbolLayerSpecification,
		{
			id: 'poi_building_layer',
			'source-layer': 'fac_building_point',

			...LAYER_BASE
		} as SymbolLayerSpecification
	]
};

export const poiLayersIds = poiStyleJson.layers.map((layer) => layer.id);
