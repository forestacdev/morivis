import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';
import type { GeoJsonEntry } from '$routes/map/data/vector/geojson';

export const geoJsonPolygonEntry: GeoJsonEntry = {
	ENSYURIN_rinhanzu: {
		type: 'vector',
		format: {
			type: 'geojson',
			geometryType: 'Polygon',
			url: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu.geojson`
		},
		metaData: {
			name: '演習林林班図', // 名前
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
			color: '#2a826c', // 塗りつぶしの色
			displayLabel: true,
			labels: [
				{
					name: '林齢のラベル',
					key: '林齢',
					value: '{林齢}'
				},
				{
					name: '小林班IDのラベル',
					key: '小林班ID',
					value: '{小林班ID}'
				},
				{
					name: '樹種のラベル',
					key: '樹種',
					value: '{樹種}'
				}
			],
			expressions: {
				color: [
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
							]
						}
					},
					{
						type: 'match',
						key: '林班',
						name: '林班区分の色分け',
						mapping: {
							categories: [1, 2, 3]
						}
					},
					{
						type: 'interpolate',
						key: '面積',
						name: '面積ごとの色分け',
						mapping: {
							min: 0,
							max: 100,
							divisions: 2
						}
					}
				],
				number: [
					{
						type: 'interpolate',
						key: '区域の線の太さ',
						name: '林齢ごとの数値',
						mapping: {
							min: 0,
							max: 100,
							divisions: 5
						}
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
		}
	},
	ENSYURIN_rinhanzu2: {
		type: 'vector',
		format: {
			type: 'geojson',
			geometryType: 'Polygon',
			url: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu.geojson`
		},
		metaData: {
			name: '演習林林班図', // 名前
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
			color: '#2a826c', // 塗りつぶしの色
			displayLabel: true,
			labels: [
				{
					name: '林齢のラベル',
					key: '林齢',
					value: '{林齢}'
				},
				{
					name: '小林班IDのラベル',
					key: '小林班ID',
					value: '{小林班ID}'
				},
				{
					name: '樹種のラベル',
					key: '樹種',
					value: '{樹種}'
				}
			],
			expressions: {
				color: [
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
							]
						}
					},
					{
						type: 'match',
						key: '林班',
						name: '林班区分の色分け',
						mapping: {
							categories: [1, 2, 3]
						}
					},
					{
						type: 'interpolate',
						key: '面積',
						name: '面積ごとの色分け',
						mapping: {
							min: 0,
							max: 100,
							divisions: 2
						}
					}
				],
				number: [
					{
						type: 'interpolate',
						key: '区域の線の太さ',
						name: '林齢ごとの数値',
						mapping: {
							min: 0,
							max: 100,
							divisions: 5
						}
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
		}
	}
};
const geoJsonMap = new Map<string, GeoJsonEntry>(Object.entries(geoJsonPolygonEntry));
