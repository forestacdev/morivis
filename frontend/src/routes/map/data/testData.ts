import type { GeojsonEntry } from '$routes/map/data/types';
import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';

type GeojsonEntry = {
	id: string;
	data: {
		name: string;
		dataType: 'geojson';
		geometryType: 'polygon' | 'line' | 'point';
		url: string;
		attribution: string;
		location: string[];
		minZoom: number;
		maxZoom: number;
		fieldDict: string;
	};
	interaction: {
		clickable: boolean;
		searchKeys: string[];
	};
	style: {
		visible: boolean;
		opacity: number;
		color: {
			single: string;
			expression: {
				key: string;
				type: 'match' | 'interpolate' | 'step';
				label: string;
				mapping: {
					keys: string[];
					values: string[];
					showIndex: number[];
				};
			}[];
		};
		numeric: {
			single: number;
			expression: {
				key: string;
				type: 'interpolate';
				label: string;
				mapping: {
					keys: number[];
					values: number[];
					showIndex: number[];
				};
			}[];
		};
		layer: {
			fill: {
				color: string;
				paint: {
					'fill-color': string;
				};
				layout: {};
			};
			line: {
				color: string;
				width: number;
				pattern: string;
				paint: {
					'line-color': string;
					'line-width': number;
					'line-dasharray': number[];
				};
				layout: {};
			};
			circle: {
				color: string;
				radius: number;
				strokeColor: string;
				strokeWidth: number;
				paint: {
					'circle-radius': number;
					'circle-stroke-width': number;
					'circle-color': string;
					'circle-stroke-color': string;
				};
				layout: {};
			};
			symbol: {
				paint: {
					'text-halo-color': string;
					'text-halo-width': number;
					'text-size': number;
					'text-field': string;
					'icon-image': string;
					'icon-size': number;
				};
				layout: {};
			};
		};
	};
	filters: {};
};

const geojsonPolygonEntries = [
	{
		id: 'ENSYURIN_rinhanzu', // ID※重複不可
		data: {
			// データの情報
			name: '演習林林班図', // 名前
			dataType: 'geojson', // データの種類
			geometryType: 'polygon', // ジオメトリの種類
			url: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu.geojson`, // データのパスURL
			attribution: '森林文化アカデミー', // データの出典
			location: ['森林文化アカデミー'], // データの位置
			minZoom: 13, // 表示するズームレベルの最小値
			maxZoom: 18, // 表示するズームレベルの最大値
			fieldDict: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu_dict.csv` // プロパティの辞書ファイルのURL
		},
		interaction: {
			// インタラクションの設定
			clickable: true, // クリック可能かどうか
			searchKeys: ['小林班ID', '樹種', '林齢']
		},
		style: {
			// スタイルの設定
			visible: true, // 表示するかどうか
			opacity: 0.5, // 透過率
			colorExpressions: [
				{
					key: '樹種',
					type: 'match',
					label: '樹種ごとの色分け',
					mapping: {
						keys: ['スギ', 'ヒノキ', 'アカマツ', 'スラッシュマツ', '広葉樹', '草地', 'その他岩石'],
						values: ['#399210', '#4ADDA5', '#DD2B2B', '#B720BF', '#EBBC22', '#2351E5', '#D98F34'],
						showIndex: []
					}
				},
				{
					key: '林班',
					type: 'match',
					label: '林班区分の色分け',
					mapping: {
						keys: [1, 2, 3],
						values: ['#399210', '#4ADDA5', '#DD2B2B'],
						showIndex: []
					}
				},
				{
					key: '面積',
					type: 'interpolate',
					label: '面積ごとの色分け',
					mapping: {
						min: 0,
						max: 1,
						divisions: 2,
						showIndex: []
					}
				}
			],
			numericExpressions: [
				{
					key: '区域の線の太さ',
					type: 'interpolate',
					label: '林齢ごとの数値',
					mapping: {
						min: 0,
						max: 100,
						divisions: 5,
						showIndex: []
					}
				}
			],

			layer: {
				fill: {
					color: {
						single: '#2a826c'
					},
					numeric: {
						single: 10,
						expression: [
							{
								key: '林齢',
								type: 'interpolate',
								label: '林齢ごとの数値',
								mapping: {
									min: 0,
									max: 100,
									divisions: 5,
									showIndex: []
								}
							}
						]
					},
					paint: {
						'fill-color': '#2a826c'
					},
					layout: {}
				},
				line: {
					color: '#2a826c',
					width: 1,
					pattern: 'dasharray',
					paint: {
						'line-color': '#2a826c',
						'line-width': 1,
						'line-dasharray': [1, 0]
					},
					layout: {}
				},
				circle: {
					color: '#ff0000',
					radius: 3,
					strokeColor: '#000000',
					strokeWidth: 1,
					paint: {
						'circle-radius': 5,
						'circle-stroke-width': 1,
						'circle-color': '#ff0000',
						'circle-stroke-color': '#000000'
					},
					layout: {}
				},
				symbol: {
					field: [
						{
							label: '小林班ID',
							key: '小林班ID',
							value: []
						},
						{
							label: '小林班ID',
							key: '小林班ID',
							value: []
						},
						{
							label: '小林班ID',
							key: '小林班ID',
							value: []
						}
					],
					color: '#000000',
					size: 12,
					'halo-color': '#ffffff',
					'halo-width': 1,

					paint: {
						'text-halo-color': '#ffffff',
						'text-halo-width': 1,
						'text-size': 12,
						'text-field': '{小林班ID}',
						'icon-image': 'marker-15',
						'icon-size': 1
					},
					layout: {}
				}
			}
		},
		filters: {}
	}
];

export { geojsonPolygonEntries };
