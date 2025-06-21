import type { SymbolLayerSpecification, SourceSpecification } from 'maplibre-gl';

const LAYER_BASE = {
	source: 'poi',
	type: 'symbol', // データタイプはサークルを指定
	layout: {
		'icon-image': 'poi-icon', // アイコンの画像名
		'icon-size': 3 // アイコンのサイズ
	}
} as const;

// Record型を使用してキーを厳密に型定義
export const poiLayers: SymbolLayerSpecification[] = [
	{
		id: 'poi_other_layer',
		'source-layer': 'fac_poi',
		...LAYER_BASE
	},
	{
		id: 'poi_ziriki_layer',
		'source-layer': 'fac_ziriki_point',
		...LAYER_BASE
	},
	{
		id: 'poi_building_layer',
		'source-layer': 'fac_building_point',

		...LAYER_BASE
	}
];

export const poiLayersIds = poiLayers.map((layer) => layer.id);
