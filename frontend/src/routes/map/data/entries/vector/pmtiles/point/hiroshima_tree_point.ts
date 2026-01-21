import {
	ENTRY_PMTILES_VECTOR_PATH,
	ENTRY_DATA_PATH,
	ENTRY_DEV_DATA_PATH,
	MAP_IMAGE_BASE_PATH
} from '$routes/constants';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';
import { HIROSHIMA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: VectorEntry<TileMetaData> = {
	id: 'hiroshima_tree_point',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Point',
		url: `https://d2g6co14qozqgp.cloudfront.net/pmtiles/tree_point_hiroshima.pmtiles`
	},
	metaData: {
		name: '広島県 単木データ',
		sourceDataName: '広島県の単木データ',
		description: '',
		attribution: 'DoboX',
		tags: ['街路樹', '単木'],
		downloadUrl: 'https://hiroshima-dobox.jp/datasets/1520',
		location: '広島県',
		minZoom: 6,
		maxZoom: 16,
		sourceLayer: 'tree_point_hiroshima',
		bounds: HIROSHIMA_BBOX,
		xyzImageTile: { x: 56906, y: 26027, z: 16 },
		mapImage: `${MAP_IMAGE_BASE_PATH}/hiroshima_tree_point.webp`
	},
	properties: {
		fields: [
			{
				key: '樹種ID',
				type: 'string',
				label: '樹種ID'
			},
			{
				key: '樹種',
				type: 'string',
				label: '樹種'
			},
			{
				key: '樹高',
				type: 'number',
				label: '樹高',
				unit: 'm'
			},
			{
				key: '胸高直径',
				type: 'number',
				label: '胸高直径',
				unit: 'cm'
			},
			{
				key: '単木材積',
				type: 'number',
				label: '単木材積',
				unit: 'm³'
			},
			{
				key: '形状比',
				type: 'number',
				label: '形状比'
			},
			{
				key: '樹冠長率',
				label: '樹冠長率',
				type: 'number',
				unit: '%'
			},
			{
				key: '樹冠面積',
				type: 'number'
			},
			{
				key: '森林計測年',
				label: '森林計測年',
				type: 'date',
				format: {
					date: {
						inputPatterns: ['YYYY-MM-DDTHH:mm:ss'],
						invalidText: '不明'
					}
				}
			},
			{
				key: '森林計測法',
				label: '森林計測法',
				type: 'string',
				valueDict: {
					'1': '航空レーザ',
					'2': '航空写真',
					'3': 'UAVレーザ',
					'4': 'UAV写真',
					'5': '地上レーザ'
				}
			},
			{
				key: '県code',
				label: '県code',
				type: 'number'
			},
			{
				key: '市町村code',
				label: '市町村code',
				type: 'number'
			}
		],
		attributeView: {
			popupKeys: [
				'樹種',
				'樹高',
				'胸高直径',
				'単木材積',
				'形状比',
				'樹冠長率',
				'樹冠面積',
				'森林計測年',
				'森林計測法',
				'県code',
				'市町村code'
			],
			titles: [
				{
					conditions: ['樹種', '樹高'],
					template: '{樹種}'
				},
				{
					conditions: [],
					template: '広島県の単木データ'
				}
			],
			relations: {
				cityCodeKey: '市町村code',
				iNaturalistNameKey: '樹種'
			}
		}
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'circle',
		opacity: 0.7,
		minZoom: 13,
		markerType: 'circle',
		colors: {
			key: '樹種',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#33a02c'
					}
				},
				{
					type: 'match',
					key: '樹種',
					name: '樹種ごとの色分け',
					mapping: {
						categories: ['スギ', 'ヒノキ'],
						values: ['#33a02c', '#b2df8a']
					}
				},
				{
					type: 'step',
					key: '樹高',
					name: '樹高の範囲による色分け',
					mapping: {
						scheme: 'YlOrRd',
						range: [7, 40],
						divisions: 6
					}
				},
				{
					type: 'step',
					key: '胸高直径',
					name: '胸高直径の範囲による色分け',
					mapping: {
						scheme: 'YlOrRd',
						range: [0, 100],
						divisions: 6
					}
				},
				{
					type: 'step',
					key: '単木材積',
					name: '単木材積の範囲による色分け',
					mapping: {
						scheme: 'YlOrRd',
						range: [0, 5],
						divisions: 6
					}
				}
			]
		},
		radius: {
			key: '胸高直径',
			expressions: [
				{
					type: 'single',
					key: '単一',
					name: '単一',
					mapping: {
						value: 8
					}
				},
				{
					type: 'linear',
					key: '胸高直径',
					name: '胸高直径',
					mapping: {
						range: [7, 40],
						values: [5, 10]
					}
				},
				{
					type: 'linear',
					key: '樹高',
					name: '樹高',
					mapping: {
						range: [7, 40],
						values: [5, 10]
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#FFFFFF',
			width: 1,
			minzoom: 16
		},
		labels: {
			key: '樹種',
			show: false,
			expressions: [
				{
					key: '樹種ID',
					name: '樹種ID'
				},
				{
					key: '樹種',
					name: '樹種'
				},
				{
					key: '樹高',
					name: '樹高'
				},
				{
					key: '胸高直径',
					name: '胸高直径'
				},
				{
					key: '単木材積',
					name: '単木材積'
				},
				{
					key: '形状比',
					name: '形状比'
				},
				{
					key: '樹冠長率',
					name: '樹冠長率'
				},
				{
					key: '樹冠面積',
					name: '樹冠面積'
				},
				{
					key: '森林計測年',
					name: '森林計測年'
				},
				{
					key: '森林計測法',
					name: '森林計測法'
				},
				{
					key: '県code',
					name: '県code'
				},
				{
					key: '市町村code',
					name: '市町村code'
				}
			]
		}
		// default: {
		// 	circle: {
		// 		paint: {
		// 			'circle-blur': 0.1
		// 		},
		// 		layout: {}
		// 	}
		// }
	},
	auxiliaryLayers: {
		layers: [
			{
				id: 'tree_point_hiroshima_aux_layer',
				type: 'heatmap',
				source: 'hiroshima_tree_point_source',
				'source-layer': 'tree_point_hiroshima',
				maxzoom: 13,
				minzoom: 6,
				paint: {
					'heatmap-opacity': 0.6,
					'heatmap-color': [
						'interpolate',
						['linear'],
						['heatmap-density'],
						0,
						'rgba(255,255,255,0)',

						1,
						'#31a354'
					],
					'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'], 6, 3, 13, 23]
				}
			}
		]
	}
};

export default entry;

/*
座標参照系: JGD2011 / Japan Plane Rectangular CS III (EPSG:6671)
レコード数: 112,414,094
範囲: X(-11959.75, 110928.75) Y(-189537.75, -99922.25)

================================================================================
属性情報 (12フィールド)
================================================================================

【樹種ID】 型: String
  ユニーク値数: 2, NULL数: 1,501,487/112,414,094
  値の分布:
    2: 79,544,989 (70.8%)
    1: 31,367,618 (27.9%)

【樹種】 型: String
  ユニーク値数: 2, NULL数: 0/112,414,094
  値の分布:
    ヒノキ: 81,046,476 (72.1%)
    スギ: 31,367,618 (27.9%)

【樹高】 型: Real
  ユニーク値数: 558, NULL数: 1,501,487/112,414,094
  最小: 2.0, 最大: 78.6, 平均: 18.09
  サンプル値: [2.7, 3.2, 4.2, 5.8, 6.9]

【胸高直径】 型: Real
  ユニーク値数: 1,368, NULL数: 1,501,487/112,414,094
  最小: 0.0, 最大: 175.2, 平均: 24.91
  サンプル値: [0.0, 1.0, 1.5, 3.5, 3.0]

【単木材積】 型: Real
  ユニーク値数: 12,169, NULL数: 1,569,048/112,414,094
  最小: 0.0, 最大: 36.455, 平均: 0.55
  サンプル値: [0.125, 0.25, 0.875, 0.5, 0.375]

【形状比】 型: Integer
  ユニーク値数: 407, NULL数: 1,501,497/112,414,094
  最小: 15, 最大: 3900, 平均: 75.12
  サンプル値: [15, 16, 17, 18, 19]

【樹冠長率】 型: Real
  ユニーク値数: 988, NULL数: 1,501,487/112,414,094
  最小: 0.0, 最大: 98.7, 平均: 31.27
  サンプル値: [0.5, 1.0, 2.8, 3.2, 4.2]

【樹冠面積】 型: Real
  ユニーク値数: 974, NULL数: 45,970,452/112,414,094
  最小: 0.2, 最大: 230.8, 平均: 9.59
  サンプル値: [0.5, 1.5, 2.0, 2.5, 4.0]

【森林計測年】 型: DateTime
  ユニーク値数: 14, NULL数: 43/112,414,094
  値の分布:
    2019/01/19 00:00:00: 87,053,804 (77.4%)
    2013/09/27 00:00:00: 4,771,991 (4.2%)
    2017/05/12 00:00:00: 3,917,158 (3.5%)
    2022/11/17 00:00:00: 3,590,834 (3.2%)
    2016/01/22 00:00:00: 2,990,956 (2.7%)
    2015/05/27 00:00:00: 2,746,527 (2.4%)
    2013/02/09 00:00:00: 2,572,573 (2.3%)
    2017/04/23 00:00:00: 2,210,657 (2.0%)
    2016/02/18 00:00:00: 758,747 (0.7%)
    2017/02/28 00:00:00: 687,886 (0.6%)
    2016/01/16 00:00:00: 444,322 (0.4%)
    2015/02/20 00:00:00: 418,090 (0.4%)
    2010/03/14 00:00:00: 127,370 (0.1%)
    2015/05/14 00:00:00: 123,136 (0.1%)

【森林計測法】 型: String
  ユニーク値数: 1, NULL数: 0/112,414,094
  値の分布:
    1: 112,414,094 (100.0%)

【県code】 型: String
  ユニーク値数: 1, NULL数: 0/112,414,094
  値の分布:
    34: 112,414,094 (100.0%)

【市町村code】 型: String
  ユニーク値数: 15, NULL数: 0/112,414,094
  値の分布:
    34210: 32,938,922 (29.3%)
    34209: 15,409,484 (13.7%)
    34369: 13,912,820 (12.4%)
    34100: 11,145,614 (9.9%)
    34368: 8,843,525 (7.9%)
    34213: 8,503,246 (7.6%)
    34214: 7,170,798 (6.4%)
    34545: 6,733,784 (6.0%)
    34462: 3,397,186 (3.0%)
    34212: 3,331,676 (3.0%)
    34204: 661,381 (0.6%)
    34203: 259,158 (0.2%)
    34307: 73,376 (0.1%)
    34302: 19,662 (0.0%)
    34304: 13,462 (0.0%)
*/
