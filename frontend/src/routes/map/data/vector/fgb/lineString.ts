import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';
import type { GeoJsonEntry } from '$routes/map/data/vector';

export const fgbLineStringEntry: GeoJsonEntry[] = [
	// 演習林道
	{
		id: 'ensyurin_road',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'LineString',
			url: './fgb/ensyurin_road.fgb'
		},
		metaData: {
			name: '演習林の道', // 名前
			description: '演習林の道', // 説明
			attribution: '森林文化アカデミー', // データの出典
			location: '森林文化アカデミー',
			minZoom: 13, // 表示するズームレベルの最小値
			maxZoom: 18, // 表示するズームレベルの最大値
			bounds: null // データの範囲
		},
		properties: {
			keys: ['種類'],
			dict: null // プロパティの辞書ファイルのURL
		},
		interaction: {
			// インタラクションの設定
			clickable: true, // クリック可能かどうか
			searchKeys: ['種類']
		},
		style: {
			type: 'line',
			opacity: 0.8, // 透過率
			colors: {
				key: '単色',
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
						key: '種類',
						name: '樹種ごとの色分け',
						mapping: {
							categories: ['林道', '歩道'],
							values: ['#399210', '#4ADDA5']
						}
					}
				]
			},
			labels: {
				key: '種類', // 現在選択されているラベルのキー
				show: false, // ラベル表示状態
				expressions: [
					{
						key: '種類',
						name: '道の種類',
						value: '{種類}'
					}
				]
			},
			default: {
				fill: {
					paint: {},
					layout: {}
				},
				line: {
					paint: {},
					layout: {}
				},
				circle: {
					paint: {},
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
