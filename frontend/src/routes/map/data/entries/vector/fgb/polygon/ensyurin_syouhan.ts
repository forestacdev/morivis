import { COVER_IMAGE_BASE_PATH, ENTRY_FGB_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';

import type { PolygonEntry, GeoJsonMetaData } from '$routes/map/data/types/vector/index';

const entry: PolygonEntry<GeoJsonMetaData> = {
	id: 'ensyurin_syouhan',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Polygon',
		url: `${ENTRY_FGB_PATH}/ensyurin_syouhan.fgb`
	},
	metaData: {
		name: '演習林 小班区画',
		description: '森林文化アカデミー演習林の小班区画。',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		tags: ['小班', '森林'],
		maxZoom: 17,
		minZoom: 10,
		bounds: [136.91917, 35.54692, 136.926817, 35.555122],
		mapImage: `${MAP_IMAGE_BASE_PATH}/ensyurin_syouhan.webp`,
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_syouhan.webp`,
		xyzImageTile: { x: 115387, y: 51671, z: 17 }
	},
	properties: {
		keys: ['小林班ID', '樹種', '林齢', '面積', '林班'],
		titles: [
			{
				template: '{樹種}林 {林齢}年生',
				conditions: ['樹種', '林齢']
			},
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: '演習林小班'
			}
		]
	},
	interaction: {
		// インタラクションの設定
		clickable: true // クリック可能かどうか
	},
	style: {
		type: 'fill',
		opacity: 0.5,
		colors: {
			key: '樹種',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#33a02c',
						pattern: null
					}
				},
				{
					type: 'match',
					key: '樹種',
					name: '樹種ごとの色分け',
					mapping: {
						categories: [
							'スギ',
							'ヒノキ',
							'アカマツ',
							'スラッシュマツ',
							'広葉樹',
							'草地',
							'その他岩石'
						],
						values: ['#33a02c', '#b2df8a', '#e31a1c', '#1f78b4', '#fdbf6f', '#a6cee3', '#fb9a99'],
						patterns: [null, null, null, null, null, null, null]
					}
				},
				{
					type: 'match',
					key: '林班',
					name: '林班ごとの色分け',
					mapping: {
						categories: [1, 2, 3],
						values: ['#a6cee3', '#1f78b4', '#b2df8a'],
						patterns: [null, null, null]
					}
				},
				{
					type: 'step',
					key: '林齢',
					name: '林齢の範囲による色分け',
					mapping: {
						scheme: 'BuGn',
						range: [0, 100],
						divisions: 5
					}
				},
				{
					type: 'step',
					key: '面積',
					name: '面積の範囲による色分け',
					mapping: {
						scheme: 'Oranges',
						range: [0, 1],
						divisions: 5
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#ffffff',
			width: 2,
			lineStyle: 'dashed'
		},
		labels: {
			key: '小林班ID_樹種_林齢', // 現在選択されているラベルのキー
			show: true, // ラベル表示状態の色
			expressions: [
				{
					key: '小林班ID_樹種_林齢',
					name: '小林班ID・樹種・林齢',
					value: [
						'step',
						['zoom'],
						// zoom < 15: 樹種・林齢のみ（小林班IDなし）
						[
							'case',
							['all', ['has', '樹種'], ['has', '林齢'], ['!=', ['get', '林齢'], '']],
							['concat', ['get', '樹種'], '林'],
							['has', '樹種'],
							['get', '樹種'],
							''
						],
						15, // zoom >= 15 から以下を表示
						// zoom >= 15: 小林班ID + 樹種・林齢
						[
							'case',
							[
								'all',
								['has', '小林班ID'],
								['has', '樹種'],
								['has', '林齢'],
								['!=', ['get', '林齢'], '']
							],
							[
								'concat',
								['get', '小林班ID'],
								'\n',
								['get', '樹種'],
								'林',
								'\n',
								['get', '林齢'],
								'年生'
							],
							['all', ['has', '小林班ID'], ['has', '樹種']],
							['concat', ['get', '小林班ID'], '\n', ['get', '樹種']],
							''
						]
					]
				},
				{
					key: '樹種',
					name: '樹種',
					value: [
						'case',
						['!', ['has', '樹種']],
						'', // プロパティが存在しない場合
						['==', ['get', '樹種'], ''],
						'', // 空文字の場合
						[
							'match',
							['get', '樹種'],
							['草地', 'その他', '岩石'],
							['get', '樹種'],
							['concat', ['get', '樹種'], '林']
						]
					]
				},
				{
					key: '面積',
					name: '面積',
					value: '{面積} ha'
				},
				{
					key: '小林班ID',
					name: '小林班ID',
					value: '{小林班ID}'
				},
				{
					key: '林班',
					name: '林班',
					value: '{林班}林班'
				},
				{
					key: '林齢',
					name: '林齢',
					value: [
						'case',
						['all', ['has', '林齢'], ['!=', ['get', '林齢'], '']],
						['concat', ['get', '林齢'], '年生'],
						''
					]
				},
				{
					key: '植栽年',
					name: '植栽年',
					value: [
						'case',
						['all', ['has', '植栽年'], ['!=', ['get', '植栽年'], '']],
						['concat', ['get', '植栽年'], '年'],
						''
					]
				}
			]
		}
		// default: {
		// 	symbol: {
		// 		paint: {},
		// 		layout: {
		// 			'text-padding': 4,
		// 			'symbol-spacing': 400 // デフォルト: 400px
		// 		}
		// 	}
		// }
	}
	// auxiliaryLayers: {
	// 	source: {
	// 		ensyurin_syouhan_rinhan: {
	// 			type: 'geojson',
	// 			data: `${ENTRY_GEOJSON_PATH}/ensyurin_rinhan.geojson`,
	// 			maxzoom: 14
	// 		}
	// 	},
	// 	layers: [
	// 		{
	// 			id: 'ensyurin_rinhan_fill_layer',
	// 			type: 'fill',
	// 			maxzoom: 14,
	// 			source: 'ensyurin_syouhan_rinhan',
	// 			paint: {
	// 				'fill-color': '#b2df8a',
	// 				'fill-opacity': 0.5
	// 			}
	// 		},
	// 		{
	// 			id: 'ensyurin_rinhan_line_layer',
	// 			type: 'line',
	// 			maxzoom: 14,
	// 			source: 'ensyurin_syouhan_rinhan',
	// 			paint: {
	// 				'line-color': '#ffffff',
	// 				'line-width': 2
	// 			}
	// 		},
	// 		{
	// 			id: 'ensyurin_rinhan_label_layer',
	// 			type: 'symbol',
	// 			maxzoom: 14,
	// 			source: 'ensyurin_syouhan_rinhan',
	// 			layout: {
	// 				'text-field': '{林班}林班',
	// 				'text-font': ['Noto Sans JP Regular'],
	// 				'text-size': 12,
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
	// default: {
};

export default entry;
