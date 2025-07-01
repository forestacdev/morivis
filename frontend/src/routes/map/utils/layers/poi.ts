import type { SymbolLayerSpecification, SourceSpecification } from 'maplibre-gl';
import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';

export const poiStyleJson = {
	sources: {
		fac_poi: {
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
			id: 'fac_poi',
			'source-layer': 'fac_poi',
			source: 'fac_poi',
			type: 'symbol',
			minzoom: 11,
			layout: {
				'icon-image': 'poi-icon', // アイコンの画像名
				'icon-size': 4 // アイコンのサイズ
			},
			paint: {}
		} as SymbolLayerSpecification,
		{
			id: 'poi_top',
			type: 'symbol',
			source: 'fac_top',
			maxzoom: 12,
			layout: {
				'icon-image': 'poi-icon',
				'icon-size': 3
			}
		} as SymbolLayerSpecification
	]
};

export const poiLayersIds = poiStyleJson.layers.map((layer) => layer.id);
