import { TOCHIGI_BBOX } from '$routes/map/data/location_bbox';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'tochigi_tree_species',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/tree_species/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '栃木県 樹種ポリゴン',
		description: ``,
		attribution: '栃木県森林資源データ',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/tree_species_tochigi',
		location: '栃木県',
		tags: ['森林', '林班図'],
		minZoom: 8,
		maxZoom: 18,
		sourceLayer: 'tree_species_tochigi',
		bounds: TOCHIGI_BBOX,
		xyzImageTile: { x: 29096, y: 12791, z: 15 }
	},
	properties: {
		keys: [
			'解析樹種ID',
			'解析樹種',
			'樹種ID',
			'樹種',
			'面積_ha',
			'森林計測年',
			'森林計測法',
			'県code',
			'市町村code',
			'年度'
		],
		titles: [
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: '栃木県の樹種ポリゴン'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.5,
		colors: {
			key: '解析樹種',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#349f1c',
						pattern: null
					}
				},
				{
					type: 'match',
					key: '解析樹種',
					name: '樹種ごとの色分け',
					mapping: {
						categories: [
							'スギ',
							'ヒノキ類',
							'マツ類',
							'カラマツ',
							'トドマツ',
							'エゾマツ',
							'その他Ｎ', // 針葉樹
							'クヌギ',
							'ナラ類',
							'ブナ',
							'その他L', // 広葉樹
							'タケ',

							'針広混交林',
							'新植地',
							'伐採跡地',
							'その他'
						],
						values: [
							'#33a02c',
							'#b2df8a',
							'#a6cee3',
							'#1f78b4',
							'#fb9a99',
							'#e31a1c',
							'#fdbf6f',
							'#ffff99',
							'#cab2d6',
							'#6a3d9a',
							'#ff7f00',
							'#b15928',
							'#33a02c', // 針広混交林
							'#b2df8a', // 新植地
							'#a6cee3', // 伐採跡地
							'#1f78b4' // その他（グレー）
						],
						// パターン情報（新規追加）
						patterns: [
							null,
							null,
							null,
							null,
							null,
							null,
							null,
							null,
							null,
							null,
							null,
							null,
							'tmpoly-grid-light-200-black',
							'tmpoly-grid-light-200-black',
							'tmpoly-grid-light-200-black',
							'tmpoly-grid-light-200-black'
						]
					},
					noData: {
						values: 'transparent',
						pattern: null
					}
				},
				{
					type: 'step',
					key: '面積_ha',
					name: '面積ごとの色分け',
					mapping: {
						range: [0, 200],
						divisions: 5,
						values: ['#e0f7fa', '#ed006e']
					}
				}
			]
		},
		outline: {
			show: false,
			color: '#000000',
			width: 1,
			lineStyle: 'solid'
		},
		labels: {
			key: '樹種',
			show: false,
			expressions: [
				{
					key: '樹種',
					name: '樹種',
					value: '{樹種}'
				},
				{
					key: '解析樹種ID',
					name: '解析樹種ID',
					value: '{解析樹種ID}'
				},
				{
					key: '解析樹種',
					name: '解析樹種',
					value: '{解析樹種}'
				},
				{
					key: '樹種ID',
					name: '樹種ID',
					value: '{樹種ID}'
				},
				{
					key: '面積_ha',
					name: '面積_ha',
					value: '{面積_ha}ha'
				},
				{
					key: '森林計測年',
					name: '森林計測年',
					value: '{森林計測年}'
				},
				{
					key: '森林計測法',
					name: '森林計測法',
					value: '{森林計測法}'
				},
				{
					key: '県code',
					name: '県code',
					value: '{県code}'
				},
				{
					key: '市町村code',
					name: '市町村code',
					value: '{市町村code}'
				},
				{
					key: '年度',
					name: '年度',
					value: '{年度}'
				}
			]
		},
		default: {
			symbol: {
				paint: {
					'text-color': '#000000',
					'text-halo-color': '#FFFFFF',
					'text-halo-width': 1,
					'text-opacity': 1
				},
				layout: {
					'text-max-width': 12,
					'text-size': 12,
					'text-padding': 10
				}
			}
		}
	}
};

export default entry;
