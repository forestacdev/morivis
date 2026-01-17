import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';
import { DEFAULT_POLYGON_STYLE } from '$routes/map/data/entries/vector/_style';

const entry: VectorEntry<TileMetaData> = {
	id: 'national_forest_stand',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://forestacdev.github.io/tiles-national-forest-stand/tiles/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '国有林 小班区画',
		attribution: '林野庁',
		description: '林野庁の「国有林GISデータ」の「小班区画」をベクトルタイルに加工したもの',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/a45',
		location: '全国',
		tags: ['林班', '国有林'],
		minZoom: 8,
		maxZoom: 14,
		sourceLayer: 'national_forest_stand',
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: { x: 3626, y: 1598, z: 12 },
		mapImage: `${MAP_IMAGE_BASE_PATH}/national_forest_stand.webp`
	},
	properties: {
		attributeView: {
			popupKeys: [
				'ID',
				'森林管理局',
				'森林管理署',
				'林班主番',
				'林班枝番',
				'小班主番',
				'小班枝番',
				'局名称',
				'署名称',
				'小班名',
				'林小班名称',
				'材積',
				'国有林名',
				'担当区',
				'県市町村',
				'樹種１',
				'樹立林齢１',
				'樹種２',
				'樹立林齢２',
				'樹種３',
				'樹立林齢３',
				'計画区',
				'林種の細分',
				'機能類型',
				'面積',
				'保安林１',
				'保安林２',
				'保安林３',
				'保安林４',
				'樹立年度'
			],
			titles: [
				{
					conditions: ['樹種１'],
					template: '{樹種１}林 {樹立林齢１}年生'
				},
				{
					conditions: [],
					template: '国有林'
				}
			],
			relations: {
				iNaturalistNameKey: '樹種１'
			}
		},
		fields: []
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.5,
		colors: {
			key: '樹種１',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#b2df8a',
						pattern: null
					}
				},
				{
					type: 'match',
					key: '樹種１',
					name: '第一樹種ごとの色分け',
					mapping: {
						categories: [
							'スギ',
							'ヒノキ',
							'カラマツ',
							'トドマツ',
							'エゾマツ',
							'アカマツ',
							'その他針葉樹',
							'クヌギ',
							'コナラ',
							'ブナ',
							'その他広葉樹',
							'マダケ',

							'リキダマツ',
							'天然ヒノキ',
							'天然スギ',
							'ウワミズサクラ',
							'ストローブマツ',
							'ヤマサクラ',
							'コウヨウザン',
							'ヨーロッパアカマツ',
							'エドヒガン',
							'ダフリカカラマツ',
							'キハダ',

							'シベリアカラマツ',
							'イタヤカエデ',
							'サワラ',
							'テーダマツ',
							'カエデ',
							'ヒバ',
							'外国針葉樹',
							'イロハモミジ',
							'トチノキ',
							'天然カラマツ',
							'シナノキ',
							'グイマツ',
							'イヌブナ',
							'アサダ',
							'グイマツＦ１',
							'クリ',
							'センノキ',
							'アカガシ',
							'シオジ',
							'天然アカマツ',
							'シラカシ',
							'ニレ',
							'アイグロマツ',
							'ウラジロガシ',
							'ヤチダモ',
							'クロマツ',
							'ツクバネカシ',
							'キリ',
							'ヒメコマツ',
							'イチイガシ',
							'ツゲ',
							'キタゴヨウ',
							'アラカシ',
							'イヌエンジュ',
							'チョウセンゴヨウ',
							'ウバメガシ',
							'ミズキ',
							'リョウブ',
							'天然トドマツ',
							'アベマキ',
							'センダン',
							'アオモリトドマツ',
							'ミズナラ',
							'ツバキ',
							'ヤブツバキ',
							'天然エゾマツ',
							'カシワ',
							'ナツツバキ',
							'アカエゾマツ',
							'シイ',
							'ヒメシャラ',
							'天然アカエゾマツ',
							'スダジイ',
							'ウルシ',
							'リュウキュウマツ',
							'サワグルミ',
							'コブシ',
							'コウヤマキ',
							'オニグルミ',
							'シウリザクラ',
							'モミ',
							'テウチグルミ',
							'アオダモ',
							'ウラジロモミ',
							'シラカバ',
							'ヤナギ',
							'ヒメバラモミ',
							'欧州シラカバ',
							'ヤマモモ',
							'シラベ',
							'ウダイカンバ',
							'ヤシャブシ',
							'トガサワラ',
							'カンバ',
							'ムクノキ',
							'ツガ',
							'ダケカンバ',
							'オヒョウ',
							'コメツガ',
							'ミヤマシキミ',
							'エノキ',
							'ハリモミ',
							'ドロノキ',
							'ヤマグルマ',
							'トウヒ',
							'ギンドロ',
							'ニセアカシヤ',
							'ネズコ',
							'ミズメ',
							'エゴノキ',
							'イヌマキ',
							'ハンノキ',
							'ポプラ',
							'ナギ',
							'ケヤマハンノキ',
							'イジュ',
							'イチョウ',
							'コバノヤマハンノキ',
							'ヒルギ',
							'カヤ',
							'ケヤキ',
							'アキグミ',
							'イチイ',
							'カツラ',
							'ドイツトウヒ',
							'ホオノキ',
							'その他外来広葉樹',
							'フランスカイガンショウ',
							'クス',
							'レジノーサマツ',
							'タブ',
							'ハチク',
							'バンクシャマツ',
							'イス',
							'モウソウチク',
							'スラッシュマツ',
							'シデ',
							'米マツ',
							'トネリコ',
							'コーカサスモミ',
							'サクラ'
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
							'#b15928'
						],
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
							null
						]
					},
					noData: {
						category: '未分類',
						value: '#F7F7F7',
						pattern: null
					}
				},
				{
					type: 'step',
					key: '材積',
					name: '材積による色分け',
					mapping: {
						scheme: 'RdPu',
						range: [0, 5000],
						divisions: 9
					}
				},
				{
					type: 'step',
					key: '面積',
					name: '面積による色分け',
					mapping: {
						scheme: 'RdPu',
						range: [0, 100],
						divisions: 9
					}
				},
				{
					type: 'step',
					key: '樹立林齢１',
					name: '第一樹種樹立林齢による色分け',
					mapping: {
						scheme: 'RdPu',
						range: [0, 200],
						divisions: 9
					}
				},
				{
					type: 'step',
					key: '樹立林齢２',
					name: '第二樹種樹立林齢による色分け',
					mapping: {
						scheme: 'BuGn',
						range: [0, 200.0],
						divisions: 9
					}
				},
				{
					type: 'step',
					key: '樹立林齢３',
					name: '第三樹種樹立林齢による色分け',
					mapping: {
						scheme: 'BuGn',
						range: [0, 415.0],
						divisions: 9
					}
				}
			]
		},
		outline: {
			show: true,
			minZoom: 11,
			color: '#ebebeb',
			width: 0.5,
			lineStyle: 'dashed'
		},
		labels: {
			key: 'auto',
			show: true,
			minZoom: 12,
			expressions: [
				{
					key: 'auto',
					name: '小班名・樹種・林齢',
					expression: [
						'step',
						['zoom'],
						// zoom < 15: 樹種・林齢のみ（小林班IDなし）
						[
							'case',
							['all', ['has', '樹種１'], ['has', '樹立林齢１'], ['!=', ['get', '樹立林齢１'], '']],
							['concat', ['get', '樹種１'], '林'],
							['has', '樹種１'],
							['get', '樹種１'],
							''
						],
						15, // zoom >= 15 から以下を表示
						// zoom >= 15: 小林班ID + 樹種・林齢
						[
							'case',
							[
								'all',
								['has', '林班主番'],
								['has', '小班主番'],
								['has', '樹種１'],
								['has', '樹立林齢１'],
								['!=', ['get', '樹立林齢１'], '']
							],
							[
								'concat',
								['get', '林班主番'],
								' ',
								['get', '小班主番'],
								'\n',
								['get', '樹種１'],
								'林',
								'\n',
								['get', '樹立林齢１'],
								'年生'
							],
							['all', ['has', '林班主番'], ['has', '小班主番'], ['has', '樹種１']],
							['concat', ['get', '林班主番'], ' ', ['get', '小班主番'], '\n', ['get', '樹種１']],
							['all', ['has', '林班主番'], ['has', '小班主番']],
							['concat', ['get', '林班主番'], ' ', ['get', '小班主番']],
							''
						]
					]
				},
				{
					key: 'ID',
					name: 'ID'
				},
				{
					key: '森林管理局',
					name: '森林管理局'
				},
				{
					key: '森林管理署',
					name: '森林管理署'
				},
				{
					key: '林班主番',
					name: '林班主番'
				},
				{
					key: '林班枝番',
					name: '林班枝番'
				},
				{
					key: '小班主番',
					name: '小班主番'
				},
				{
					key: '小班枝番',
					name: '小班枝番'
				},
				{
					key: '局名称',
					name: '局名称'
				},
				{
					key: '署名称',
					name: '署名称'
				},
				{
					key: '小班名',
					name: '小班名'
				},
				{
					key: '林小班名称',
					name: '林小班名称'
				},
				{
					key: '材積',
					name: '材積'
				},
				{
					key: '国有林名',
					name: '国有林名'
				},
				{
					key: '担当区',
					name: '担当区'
				},
				{
					key: '県市町村',
					name: '県市町村'
				},
				{
					key: '樹種１',
					name: '第一樹種',
					expression: [
						'case',
						['!', ['has', '樹種１']],
						'', // プロパティが存在しない場合
						['==', ['get', '樹種１'], ''],
						'', // 空文字の場合
						['concat', ['get', '樹種１'], '林']
					]
				},
				{
					key: '樹立林齢１',
					name: '第一樹種樹立林齢',
					expression: [
						'case',
						['!', ['has', '樹立林齢１']],
						'', // プロパティが存在しない場合
						['==', ['get', '樹立林齢１'], ''],
						'', // 空文字の場合
						['concat', ['get', '樹立林齢１'], '年']
					]
				},
				{
					key: '樹種２',
					name: '第二樹種',
					expression: [
						'case',
						['!', ['has', '樹種２']],
						'', // プロパティが存在しない場合
						['==', ['get', '樹種２'], ''],
						'', // 空文字の場合
						['concat', ['get', '樹種２'], '林']
					]
				},
				{
					key: '樹立林齢２',
					name: '第二樹種樹立林齢',
					expression: [
						'case',
						['!', ['has', '樹立林齢２']],
						'', // プロパティが存在しない場合
						['==', ['get', '樹立林齢２'], ''],
						'', // 空文字の場合
						['concat', ['get', '樹立林齢２'], '年']
					]
				},
				{
					key: '樹種３',
					name: '第三樹種',
					expression: [
						'case',
						['!', ['has', '樹種３']],
						'', // プロパティが存在しない場合
						['==', ['get', '樹種３'], ''],
						'', // 空文字の場合
						['concat', ['get', '樹種３'], '林']
					]
				},
				{
					key: '樹立林齢３',
					name: '第三樹種樹立林齢',
					expression: [
						'case',
						['!', ['has', '樹立林齢３']],
						'', // プロパティが存在しない場合
						['==', ['get', '樹立林齢３'], ''],
						'', // 空文字の場合
						['concat', ['get', '樹立林齢３'], '年']
					]
				},
				{
					key: '計画区',
					name: '計画区'
				},
				{
					key: '林種の細分',
					name: '林種の細分'
				},
				{
					key: '機能類型',
					name: '機能類型'
				},
				{
					key: '面積',
					name: '面積'
				},
				{
					key: '保安林１',
					name: '保安林種別１'
				},
				{
					key: '樹立年度',
					name: '樹立年度'
				}
			]
		},

		default: {
			...DEFAULT_POLYGON_STYLE
		}
	}
	// auxiliaryLayers: {
	// 	source: {
	// 		national_forest_compartment: {
	// 			type: 'vector',
	// 			tiles: [
	// 				'https://forestacdev.github.io/tiles-national-forest-compartment/tiles/{z}/{x}/{y}.pbf'
	// 			],
	// 			maxzoom: 12
	// 		}
	// 	},
	// 	layers: [
	// 		{
	// 			id: 'national_forest_compartment_fill_layer',
	// 			type: 'fill',
	// 			maxzoom: 12.1,
	// 			source: 'national_forest_compartment',
	// 			'source-layer': 'national_forest_compartment',
	// 			paint: {
	// 				'fill-color': '#b2df8a',
	// 				'fill-opacity': 0.5,
	// 				'fill-outline-color': [
	// 					'interpolate',
	// 					['linear'],
	// 					['zoom'],
	// 					8,
	// 					'transparent', // ズーム8以下：透明
	// 					10,
	// 					'#dcdcdc', // ズーム8以下：透明
	// 					12,
	// 					'#dcdcdc' // ズーム12：中程度のグレー
	// 				]
	// 			}
	// 		},

	// 		{
	// 			id: 'national_forest_compartment_label_layer',
	// 			type: 'symbol',
	// 			maxzoom: 12.1,
	// 			minzoom: 10,
	// 			source: 'national_forest_compartment',
	// 			'source-layer': 'national_forest_compartment',
	// 			layout: {
	// 				'text-field': '{林班主番}-{林班枝番}',
	// 				'text-font': ['Noto Sans JP Regular'],
	// 				'text-size': 10,
	// 				'text-anchor': 'center'
	// 			},
	// 			paint: {
	// 				'text-color': '#000000',
	// 				'text-halo-color': '#ffffff',
	// 				'text-halo-width': 1
	// 			}
	// 		}
	// 	]
	// }
};

export default entry;
