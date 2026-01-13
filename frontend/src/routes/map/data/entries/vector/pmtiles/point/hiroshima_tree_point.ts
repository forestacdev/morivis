import { ENTRY_PMTILES_VECTOR_PATH, ENTRY_DATA_PATH } from '$routes/constants';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';
import { generateHueBasedHexColors } from '$routes/map/utils/color_mapping';
import {
	HIROSHIMA_BBOX,
	WEB_MERCATOR_WORLD_BBOX
} from '$routes/map/data/entries/_meta_data/_bounds';
import { createFilteredTreeMatchColorStyleMapping } from '$routes/map/data/entries/vector/_style';

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
		minZoom: 14,
		maxZoom: 16,
		sourceLayer: 'tree_point_hiroshima',
		bounds: WEB_MERCATOR_WORLD_BBOX,
		xyzImageTile: { x: 14552, y: 6452, z: 14 }
	},
	properties: {
		fields: [
			{
				key: '樹種',
				type: 'string',
				label: '樹種'
			},
			{
				key: '区分',
				type: 'string',
				label: '区分'
			},
			{
				key: '樹高(m)',
				type: 'number',
				label: '樹高',
				unit: 'm'
			},
			{
				key: '枝張(m)',
				type: 'number',
				label: '枝張',
				unit: 'm'
			},
			{
				key: '幹周(cm）',
				type: 'number',
				label: '幹周',
				unit: 'cm'
			},
			{
				key: '行政区',
				type: 'string',
				label: '行政区'
			},
			{
				key: '種別',
				type: 'string',
				label: '種別'
			},
			{
				key: '整理番号',
				type: 'string',
				label: '整理番号'
			},
			{
				key: '路線名',
				type: 'string',
				label: '路線名'
			},
			{
				key: '通称道路名',
				type: 'string',

				label: '通称道路名'
			},
			{
				key: '経度',
				type: 'number',
				label: '経度'
			},
			{
				key: '緯度',
				type: 'number',
				label: '緯度'
			}
		],
		attributeView: {
			popupKeys: [
				'樹種',
				'区分',
				'樹高(m)',
				'枝張(m)',
				'幹周(cm）',
				'行政区',
				'種別',
				'整理番号',
				'路線名',
				'通称道路名'
			],
			titles: [
				{
					conditions: ['樹種'],
					template: '{樹種}'
				},
				{
					conditions: [],
					template: '広島県の単木データ'
				}
			],
			relations: {
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
				}
			]
		},
		radius: {
			key: '樹高',
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
			width: 2
		},
		labels: {
			key: '樹種',
			show: false,
			expressions: [
				{
					key: '樹種',
					name: '樹種'
				},
				{
					key: '区分',
					name: '区分'
				},
				{
					key: '樹高(m)',
					name: '樹高'
				},
				{
					key: '枝張(m)',
					name: '枝張'
				},
				{
					key: '幹周(cm）',
					name: '幹周'
				},
				{
					key: '行政区',
					name: '行政区'
				},
				{
					key: '種別',
					name: '種別'
				},
				{
					key: '整理番号',
					name: '整理番号'
				},
				{
					key: '路線名',
					name: '路線名'
				}
			]
		}
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
