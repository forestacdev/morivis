import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'tree_species_tochigi',
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
		bounds: [139.326731, 36.199924, 140.291983, 37.155039],
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
						value: '#349f1c'
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
							'その他Ｎ',
							'クヌギ',
							'ナラ類',
							'ブナ',
							'その他L',
							'タケ',
							'針広混交林',
							'新植地',
							'伐採跡地',
							'その他'
						],
						values: [
							'#00cc66',
							'#99ff66',
							'#cc0000',
							'#ff9966',
							'#ffcc99',
							'#cc6600',
							'#cc00cc',
							'#ffff99',
							'#ff9933',
							'#cc9900',
							'#ffff00',
							'#8000ff',
							'#8db3e2',
							'#ccff99',
							'#ff80ff',
							'#bfbfbf'
						]
					}
				},
				// {
				// 	type: 'match',
				// 	key: '解析樹種ID',
				// 	name: '解析樹種IDごとの色分け',
				// 	mapping: {
				// 		categories: [
				// 			'01',
				// 			'02',
				// 			'03',
				// 			'04',
				// 			'05',
				// 			'06',
				// 			'07',
				// 			'08',
				// 			'09',
				// 			'10',
				// 			'11',
				// 			'12',
				// 			'96',
				// 			'97',
				// 			'98',
				// 			'99'
				// 		],
				// 		values: [
				// 			'#00cc66',
				// 			'#99ff66',
				// 			'#cc0000',
				// 			'#ff9966',
				// 			'#ffcc99',
				// 			'#cc6600',
				// 			'#cc00cc',
				// 			'#ffff99',
				// 			'#ff9933',
				// 			'#cc9900',
				// 			'#ffff00',
				// 			'#8000ff',
				// 			'#8db3e2',
				// 			'#ccff99',
				// 			'#ff80ff',
				// 			'#bfbfbf'
				// 		]
				// 	}
				// },
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
