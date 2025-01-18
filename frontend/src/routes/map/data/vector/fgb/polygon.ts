import type { GeoJsonMetaData, PolygonEntry } from '$map/data/types/vector';
import { COVER_IMAGE_BASE_PATH } from '$map/constants';

export const fgbPolygonEntry: PolygonEntry<GeoJsonMetaData>[] = [
	// 演習林林班図
	{
		id: 'ensyurin_rinhan',
		type: 'vector',
		format: {
			type: 'fgb',
			geometryType: 'Polygon',
			url: './fgb/ensyurin_rinhan.fgb'
		},
		metaData: {
			name: '演習林林班', // 名前
			description: '森林文化アカデミー演習林の林班。', // 説明
			attribution: '森林文化アカデミー', // データの出典
			location: '森林文化アカデミー',
			maxZoom: 24, // 表示するズームレベルの最大値
			bounds: null, // データの範囲
			coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin.webp` // カバー画像
		},
		properties: {
			keys: ['小林班ID', '樹種', '林齢', '面積', '林班'],
			dict: null,
			titles: [
				{
					conditions: ['樹種', '林齢'],
					template: '{樹種}林 {林齢}年生'
				},
				{
					conditions: ['樹種'],
					template: '{樹種}'
				},
				{
					conditions: [],
					template: '演習林林班'
				}
			]
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
				key: '樹種',
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
							values: ['#399210', '#4ADDA5', '#DD2B2B', '#B720BF', '#EBBC22', '#2351E5', '#D98F34']
						}
					},
					{
						type: 'match',
						key: '林班',
						name: '林班ごとの色分け',
						mapping: {
							categories: [1, 2, 3],
							values: ['#ff0000', '#059854', '#9d00ff']
						}
					},
					{
						type: 'step',
						key: '林齢',
						name: '林齢の範囲による色分け',
						mapping: {
							range: [0, 100],
							divisions: 5,
							values: ['#ffffff', '#059854']
						}
					},
					{
						type: 'step',
						key: '面積',
						name: '面積の範囲による色分け',
						mapping: {
							range: [0, 1],
							divisions: 5,
							values: ['#ffffff', '#ff0000']
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
				},
				fillExtrusion: {
					paint: {},
					layout: {}
				}
			}
		},
		extension: {},
		debug: false
	}
];
