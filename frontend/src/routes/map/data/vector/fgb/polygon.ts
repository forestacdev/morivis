import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';
import type { GeoJsonEntry } from '$routes/map/data/vector';

export const fgbPolygonEntry: GeoJsonEntry[] = [
	// 演習林林班図
	{
		id: 'ensyurin_rinhanzu_fgb',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'Polygon',
			url: './fgb/ensyurin_rinhan.fgb'
		},
		metaData: {
			name: '演習林林班図fgb', // 名前
			description: '岐阜県の演習林の林班図です。', // 説明
			attribution: '森林文化アカデミー', // データの出典
			location: '森林文化アカデミー',
			minZoom: 13, // 表示するズームレベルの最小値
			maxZoom: 18, // 表示するズームレベルの最大値
			bounds: null // データの範囲
		},
		properties: {
			keys: ['小林班ID', '樹種', '林齢', '面積', '林班'],
			dict: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu_dict.csv` // プロパティの辞書ファイルのURL
		},
		interaction: {
			// インタラクションの設定
			clickable: true, // クリック可能かどうか
			searchKeys: ['小林班ID', '樹種', '林齢']
		},
		style: {
			type: 'fill',
			opacity: 0.5, // 透過率
			colors: {
				key: '林齢',
				expressions: [
					{
						type: 'single',
						key: '単色',
						name: '単色',
						mapping: {
							value: '#00ff00'
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
							values: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#000000']
						}
					},
					{
						type: 'match',
						key: '林班',
						name: '林班ごとの色分け',
						mapping: {
							categories: [1, 2, 3],
							values: ['#ff0000', '#00ff00', '#0000ff']
						}
					},
					{
						type: 'step',
						key: '林齢',
						name: '林齢の範囲による色分け',
						mapping: {
							range: [0, 100],
							divisions: 5,
							colorScale: 'PuBu'
						}
					}
				]
			},
			labels: {
				key: '林齢', // 現在選択されているラベルのキー
				show: true, // ラベル表示状態
				expressions: [
					{
						key: '小林班ID',
						name: '小林班IDのラベル',
						value: '{小林班ID}'
					},
					{
						key: '林齢',
						name: '林齢のラベル',
						value: '{林齢}'
					},
					{
						key: '樹種',
						name: '樹種のラベル',
						value: '{樹種}'
					}
				]
			},
			default: {
				fill: {
					paint: {},
					layout: {}
				},
				line: {
					paint: {
						'line-width': 1,
						'line-dasharray': [1, 0]
					},
					layout: {}
				},
				circle: {
					paint: {
						'circle-radius': 5,
						'circle-stroke-width': 1,
						'circle-stroke-color': '#000000'
					},
					layout: {}
				},
				symbol: {
					paint: {},
					layout: {}
				}
			}
		},
		extension: {},
		debug: false
	}
];
