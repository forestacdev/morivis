import { COVER_IMAGE_BASE_PATH, ENTRY_FGB_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';
import { TABLE_JOIN_DATA_PATH } from '$routes/constants/index';

import type { PolygonEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: PolygonEntry<TileMetaData> = {
	id: 'experimental_landformclassification1',
	type: 'vector',
	format: {
		type: 'geojsontile',
		geometryType: 'Polygon',
		url: `https://cyberjapandata.gsi.go.jp/xyz/experimental_landformclassification1/{z}/{x}/{y}.geojson`
	},
	metaData: {
		name: '地形分類（自然地形）',
		description: '',
		attribution: '国土地理院',
		location: '全国',
		sourceLayer: 'geojsonLayer',
		maxZoom: 16,
		minZoom: 4,
		promoteId: 'code',
		tags: ['地形分類'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: { x: 225, y: 100, z: 8 },
		sourceDataName: '国土地理院ベクトルタイル提供実験（地形分類）',
		downloadUrl: 'https://github.com/gsi-cyberjapan/experimental_landformclassification',
		mapImage: `${MAP_IMAGE_BASE_PATH}/experimental_landformclassification1.webp`
	},
	properties: {
		keys: [],
		titles: [
			{
				conditions: ['name'],
				template: '{name}'
			},
			{
				conditions: [],
				template: '地形分類（自然地形）'
			}
		],
		dict: {
			type: '図式コード',
			name: '地形分類名',
			description: '成因など',
			risk: 'リスク'
		},
		joinDataUrl: `${TABLE_JOIN_DATA_PATH}/experimental_landformclassification1.json`
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.5,
		colors: {
			key: 'name',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#cab2d6'
					}
				},
				{
					type: 'match',
					key: 'name',
					name: '地形分類名ごとの色分け',
					mapping: {
						categories: [
							'山地斜面等',
							'崖･段丘崖',
							'地すべり地形',
							'台地･段丘',
							'山麓堆積地形',
							'扇状地',
							'自然堤防',
							'天井川等',
							'砂州・砂丘',
							'凹地・浅い谷',
							'氾濫平野・海岸平野',
							'後背低地･湿地',
							'旧河道',
							'落堀',
							'河川敷･浜',
							'水部',
							'旧水部',
							'切土地',
							'農耕平坦化地',
							'盛土地･埋立地',
							'干拓地',
							'改変工事中',
							'地図を拡大すると表示されます。',
							'数値地図25000(土地条件)',
							'治水地形分類図(更新版)',
							'脆弱地形調査',
							'土地条件図',
							'沿岸海域土地条件図',
							'地形分類データ整備による',
							'山地',
							'残丘状地形',
							'カルスト地形',
							'丘陵・小起伏地',
							'火山地形(明瞭)',
							'火山地形(やや不明瞭)',
							'火山性丘陵',
							'火山麓地形',
							'台地・段丘',
							'低地',
							'砂丘',
							'湖',
							'山地・丘陵',
							'火山地形',
							'',
							'拡大すると地形分類が表示されます。'
						],
						values: [
							'#d9cbae',
							'#9466ab',
							'#cc99ff',
							'#ffaa00',
							'#99804d',
							'#cacc60',
							'#ffff33',
							'#fbe09d',
							'#ffff99',
							'#a3cc7e',
							'#bbff99',
							'#00d1a4',
							'#6699ff',
							'#1f9999',
							'#9f9fc4',
							'#e5ffff',
							'#779999',
							'#85c4d1',
							'#8ad8b6',
							'#ef8888',
							'#c37aff',
							'#ffe8e8',
							'#144dfa',
							'#e6e600',
							'#00e2e6',
							'#2ae600',
							'#e60400',
							'#5e5ce6',
							'#ff9600',
							'#998b79',
							'#664d55',
							'#7580D2',
							'#C9FF05',
							'#FF0116',
							'#FF5101',
							'#C975B0',
							'#FFBBFC',
							'#ffb31a',
							'#C7FFF7',
							'#FFEA01',
							'#1201FF',
							'#998c7a',
							'#FF0116',
							'#85B6E7',
							'#ff00ff'
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
							null
						]
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
			key: 'name', // 現在選択されているラベルのキー
			show: false, // ラベル表示状態
			expressions: [
				{
					key: 'code',
					name: '図式コード',
					value: '{code}'
				},
				{
					key: 'name',
					name: '地形分類名',
					value: '{name}'
				},
				{
					key: 'description',
					name: '成因など',
					value: '{description}'
				},
				{
					key: 'risk',
					name: 'リスク',
					value: '{risk}'
				}
			]
		}
	}
};

export default entry;
