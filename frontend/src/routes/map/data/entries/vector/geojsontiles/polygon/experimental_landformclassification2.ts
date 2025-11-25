import { COVER_IMAGE_BASE_PATH, ENTRY_FGB_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';
import { TABLE_JOIN_DATA_PATH } from '$routes/constants/index';

import type { PolygonEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: PolygonEntry<TileMetaData> = {
	id: 'experimental_landformclassification2',
	type: 'vector',
	format: {
		type: 'geojsontile',
		geometryType: 'Polygon',
		url: `https://cyberjapandata.gsi.go.jp/xyz/experimental_landformclassification2/{z}/{x}/{y}.geojson`
	},
	metaData: {
		name: '地形分類（人工地形）',
		description: '',
		attribution: '国土地理院',
		location: '全国',
		sourceLayer: 'geojsonLayer',
		maxZoom: 16,
		minZoom: 14,
		promoteId: 'code',
		tags: ['地形分類'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: {
			x: 14561,
			y: 6451,
			z: 14
		},
		sourceDataName: '国土地理院ベクトルタイル提供実験（地形分類）',
		downloadUrl: 'https://github.com/gsi-cyberjapan/experimental_landformclassification',
		mapImage: `${MAP_IMAGE_BASE_PATH}/experimental_landformclassification2.webp`
	},
	properties: {
		keys: [],
		titles: [
			{
				conditions: [],
				template: '地形分類（人工地形）'
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
						categories: ['切土地', '農耕平坦化地', '盛土地･埋立地', '干拓地', '改変工事中'],
						values: ['#85c4d1', '#8ad8b6', '#ef8888', '#c37aff', '#ffe8e8'],
						patterns: [null, null, null, null, null]
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
			key: 'code', // 現在選択されているラベルのキー
			show: false, // ラベル表示状態
			expressions: [
				{
					key: 'code',
					name: 'code',
					value: '{code}'
				}
			]
		}
	}
};

export default entry;
