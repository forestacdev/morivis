import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_VECTOR_POLYGON_STYLE } from '$routes/map/data/entries/vector/_style';

import type { PolygonEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const EMPTY_TEXT_RULE = [{ values: [null, ''], text: '-' }];

const entry: PolygonEntry<TileMetaData> = {
	id: 'r2ka',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/r2ka.pmtiles`
	},
	metaData: {
		name: '令和2年国勢調査 小地域（町丁・字等）',
		sourceDataName: '令和2年国勢調査 小地域（町丁・字等）',
		description:
			'令和2年国勢調査の小地域（町丁・字等）境界データ。町丁・字等単位の人口や世帯数を地図上で確認する際に利用できる。',
		attribution: 'e-Stat',
		downloadUrl:
			'https://www.e-stat.go.jp/gis/statmap-search?page=1&type=2&aggregateUnitForBoundary=A&toukeiCode=00200521&toukeiYear=2020&serveyId=A002005212020&coordsys=1&format=shape&datum=2000',
		location: '全国',
		tags: [],
		minZoom: 8,
		maxZoom: 16,
		sourceLayer: 'r2ka',
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: { x: 3638, y: 1611, z: 12 },
		mapImage: `${ENTRY_PMTILES_VECTOR_PATH}/r2ka.webp`
	},
	properties: {
		fields: [
			{ key: 'KEY_CODE', type: 'string', label: 'KEY_CODE' },
			{ key: 'PREF', type: 'string', label: '都道府県コード' },
			{ key: 'CITY', type: 'string', label: '市区町村コード' },
			{ key: 'S_AREA', type: 'string', label: '小地域コード' },
			{ key: 'PREF_NAME', type: 'string', label: '都道府県名' },
			{
				key: 'CITY_NAME',
				type: 'string',
				label: '市区町村名',
				format: { empty: EMPTY_TEXT_RULE }
			},
			{
				key: 'S_NAME',
				type: 'string',
				label: '町丁・字等名',
				format: { empty: EMPTY_TEXT_RULE }
			},
			{
				key: 'KIGO_E',
				type: 'string',
				label: '記号E',
				format: { empty: EMPTY_TEXT_RULE }
			},
			{ key: 'HCODE', type: 'integer', label: 'HCODE' },
			{ key: 'AREA', type: 'number', label: '面積', unit: 'm2', format: { digits: 0 } },
			{
				key: 'PERIMETER',
				type: 'number',
				label: '周長',
				unit: 'm',
				format: { digits: 1 }
			},
			{ key: 'R2KAxx', type: 'integer', label: 'R2KAxx' },
			{ key: 'R2KAxx_ID', type: 'integer', label: 'R2KAxx_ID' },
			{ key: 'KIHON1', type: 'string', label: '基本単位区コード1' },
			{ key: 'DUMMY1', type: 'string', label: 'DUMMY1' },
			{ key: 'KIHON2', type: 'string', label: '基本単位区コード2' },
			{ key: 'KEYCODE1', type: 'string', label: 'KEYCODE1' },
			{
				key: 'KEYCODE2',
				type: 'string',
				label: 'KEYCODE2',
				format: { empty: EMPTY_TEXT_RULE }
			},
			{
				key: 'AREA_MAX_F',
				type: 'string',
				label: '面積最大フラグ',
				format: { empty: EMPTY_TEXT_RULE }
			},
			{
				key: 'KIGO_D',
				type: 'string',
				label: '記号D',
				format: { empty: EMPTY_TEXT_RULE }
			},
			{
				key: 'N_KEN',
				type: 'string',
				label: '隣接都道府県コード',
				format: { empty: EMPTY_TEXT_RULE }
			},
			{
				key: 'N_CITY',
				type: 'string',
				label: '隣接市区町村コード',
				format: { empty: EMPTY_TEXT_RULE }
			},
			{
				key: 'KIGO_I',
				type: 'string',
				label: '記号I',
				format: { empty: EMPTY_TEXT_RULE }
			},
			{ key: 'KBSUM', type: 'integer', label: '基本単位ブロック数' },
			{ key: 'JINKO', type: 'integer', label: '人口' },
			{ key: 'SETAI', type: 'integer', label: '世帯数' },
			{
				key: 'X_CODE',
				type: 'number',
				label: '代表点X',
				format: { digits: 6 }
			},
			{
				key: 'Y_CODE',
				type: 'number',
				label: '代表点Y',
				format: { digits: 6 }
			},
			{ key: 'KCODE1', type: 'string', label: 'KCODE1' }
		],
		attributeView: {
			popupKeys: [
				'PREF_NAME',
				'CITY_NAME',
				'S_NAME',
				'JINKO',
				'SETAI',
				'KBSUM',
				'AREA',
				'PERIMETER',
				'KEY_CODE',
				'KEYCODE1',
				'KEYCODE2',
				'X_CODE',
				'Y_CODE',
				'KIGO_E',
				'KIGO_D',
				'KIGO_I',
				'N_KEN',
				'N_CITY'
			],
			titles: [
				{
					conditions: ['CITY_NAME', 'S_NAME'],
					template: '{CITY_NAME} {S_NAME}'
				},
				{
					conditions: ['CITY_NAME'],
					template: '{CITY_NAME}'
				},
				{
					conditions: [],
					template: '令和2年国勢調査 小地域（町丁・字等）'
				}
			]
		}
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_VECTOR_POLYGON_STYLE,
		opacity: 0.3,
		colors: {
			key: 'JINKO',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#1f78b4',
						pattern: null
					}
				},
				{
					type: 'step',
					key: 'JINKO',
					name: '人口による色分け',
					mapping: {
						scheme: 'YlOrRd',
						range: { value: [0, 3000], domain: [0, 18516] },
						divisions: 5
					}
				},
				{
					type: 'step',
					key: 'SETAI',
					name: '世帯数による色分け',
					mapping: {
						scheme: 'PuBu',
						range: { value: [0, 1200], domain: [0, 8537] },
						divisions: 5
					}
				},
				{
					type: 'step',
					key: 'AREA',
					name: '面積による色分け',
					mapping: {
						scheme: 'YlGnBu',
						range: { value: [0, 5000000], domain: [0, 805096609.223] },
						divisions: 5
					}
				},
				{
					type: 'step',
					key: 'KBSUM',
					name: '基本単位ブロック数による色分け',
					mapping: {
						scheme: 'YlGn',
						range: { value: [0, 50], domain: [0, 228] },
						divisions: 5
					}
				}
			]
		},
		outline: {
			show: true,
			minZoom: 10,
			color: '#f8f8f8',
			width: 0.5,
			lineStyle: 'solid'
		},
		labels: {
			key: 'S_NAME',
			show: false,
			minZoom: 12,
			expressions: [
				{
					key: 'S_NAME',
					name: '町丁・字等名'
				},
				{
					key: 'CITY_NAME',
					name: '市区町村名'
				},
				{
					key: 'JINKO',
					name: '人口'
				},
				{
					key: 'SETAI',
					name: '世帯数'
				}
			]
		}
	}
};

export default entry;
