import type { GeojsonEntry } from '$routes/map/data/types';
import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';
import { format } from 'maplibre-gl';

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

const DataEntryMetadata = {};

const metaData = {
	ENSYURIN_rinhanzu: {
		name: '演習林林班図',
		description: '岐阜県の演習林の林班図です。',
		dataType: 'geojson',
		geometryType: 'polygon',
		url: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu.geojson`,
		attribution: '森林文化アカデミー',
		location: ['森林文化アカデミー'],
		minZoom: 13,
		maxZoom: 18,
		fieldDict: `${GEOJSON_BASE_PATH}/ENSYURIN_rinhanzu_dict.csv`
	},
	ENSYURIN_pole: {
		name: '演習林電柱',
		description: '岐阜県の演習林の電柱です。',
		dataType: 'geojson',
		geometryType: 'point',
		url: `${GEOJSON_BASE_PATH}/ENSYURIN_pole.geojson`,
		attribution: '森林文化アカデミー',
		location: ['森林文化アカデミー'],
		minZoom: 13,
		maxZoom: 18,
		fieldDict: `${GEOJSON_BASE_PATH}/ENSYURIN_pole_dict.csv`
	},
	ortho_photo: {
		name: 'オルソ画像',
		description: '岐阜県のオルソ画像です。',
		dataType: 'raster',
		geometryType: 'polygon',
		url: `${GIFU_DATA_BASE_PATH}/ortho_photo.tif`,
		attribution: '岐阜県',
		location: ['岐阜県'],
		minZoom: 13,
		maxZoom: 18,
		fieldDict: ''
	}
};

export const geoDataIds = ['ENSYURIN_rinhanzu', 'ENSYURIN_pole', 'ortho_photo'] as const;

type GeoDataId = (typeof geoDataIds)[number];

interface MetaData {
	name: string;
	description: string;
}

interface GeoDataEntry {
	id: GeoDataId;
	metaData: MetaData;
	// 必要に応じて他のフィールドも追加
}

const map = new Map([
	['ENSYURIN_rinhanzu', { metaData: { name: '演習林林班図', description: '説明' } }],
	['ENSYURIN_pole', { metaData: { name: '演習林ポール', description: '説明' } }]
]);

export const GeojsonDataEntry = new Map<GeoDataId, any>([
	[
		'ENSYURIN_rinhanzu',
		{
			type: 'vector',
			format: {
				type: 'geojson',
				geometryType: 'polygon',
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
				color: '#2a826c', // 塗りつぶしの色色
				expressions: {
					color: [
						{
							key: '樹種',
							type: 'match',
							name: '樹種ごとの色分け',
							categories: [
								'スギ',
								'ヒノキ',
								'アカマツ',
								'スラッシュマツ',
								'広葉樹',
								'草地',
								'その他岩石'
							]
							// colors: ['#399210', '#4ADDA5', '#DD2B2B', '#B720BF', '#EBBC22', '#2351E5', '#D98F34'],
							// showIndex: []
						},
						{
							type: 'match',
							key: '林班',
							name: '林班区分の色分け',
							categories: [1, 2, 3]
						},
						{
							type: 'interpolate',
							key: '面積',
							name: '面積ごとの色分け',
							mapping: {
								range: [0, 1],
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
					]
				},
				label: {
					data: [
						{
							name: '小林班ID',
							value: '{林齢}'
						},
						{
							name: '小林班ID',
							value: '{小林班ID}'
						},
						{
							name: '小林班ID',
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
			}
		}
	]
]);
