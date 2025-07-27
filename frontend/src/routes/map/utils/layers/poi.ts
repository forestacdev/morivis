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
				'icon-size': 4, // アイコンのサイズ
				// 'symbol-sort-key': [
				// 	'case',
				// 	// 特定の1つのfeature_idを最優先
				// 	['==', ['id'], 54],
				// 	0, // 最優先
				// 	// その他全て
				// 	1 // 通常優先度
				// ],
				// 'symbol-sort-key': [
				// 	'case',
				// 	// 最優先feature_id
				// 	['==', ['get', 'category'], '自力建設'],
				// 	0,

				// 	// 2番目の優先度（表示したい場合）
				// 	['==', ['get', 'category'], 'アカデミー施設'],
				// 	1,

				// 	// その他
				// 	2
				// ],

				'symbol-sort-key': 1, // 全て同じ優先度
				'symbol-z-order': 'source' // sort-keyに基づく順序を使用
			},
			paint: {}
		} as SymbolLayerSpecification,
		{
			id: 'poi_top',
			type: 'symbol',
			source: 'fac_top',
			maxzoom: 12,
			minzoom: 4,
			layout: {
				'icon-image': 'poi-icon',
				'icon-size': 3
			}
		} as SymbolLayerSpecification
	]
};

export const poiLayersIds = poiStyleJson.layers.map((layer) => layer.id);
