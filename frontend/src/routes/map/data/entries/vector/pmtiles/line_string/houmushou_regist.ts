import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import type { PolygonEntry, TileMetaData } from '$routes/map/data/types/vector';
import { MAP_IMAGE_BASE_PATH } from '$routes/constants';

const entry: PolygonEntry<TileMetaData> = {
	id: 'houmushou_regist',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: `https://habs.rad.naro.go.jp/spatial_data/amx/a.pmtiles`
	},
	metaData: {
		name: '法務省登記所備付地図データ',
		attribution: '登記所備付地図データ（法務省）',
		description: '法務省の登記所備付地図データをベクトルタイルに加工した地番ポリゴンのデータ。',
		location: '全国',
		tags: ['登記所備付地図'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		maxZoom: 16,
		minZoom: 2,
		promoteId: '地番',
		sourceLayer: 'fude',
		xyzImageTile: { x: 58262, y: 25712, z: 16 },
		downloadUrl: 'https://github.com/amx-project/a-spec?tab=readme-ov-file',
		mapImage: `${MAP_IMAGE_BASE_PATH}/houmushou_regist.webp`
	},
	properties: {
		attributeView: {
			popupKeys: [
				'座標系',
				'測地系判別',
				'地図名',
				'地図番号',
				'縮尺分母',
				'市区町村コード',
				'市区町村名',
				'大字コード',
				'丁目コード',
				'小字コード',
				'予備コード',
				'大字名',
				'地番',
				'精度区分',
				'座標値種別'
			],
			titles: [
				{
					conditions: ['地番'],
					template: '地番 {地番}'
				},
				{
					conditions: [],
					template: '登記所備付地図'
				}
			]
		},
		fields: [
			{
				key: '座標系',
				label: '座標系'
			},
			{
				key: '測地系判別',
				label: '測地系判別'
			},
			{
				key: '地図名',
				label: '地図名'
			},
			{
				key: '地図番号',
				label: '地図番号'
			},
			{
				key: '縮尺分母',
				label: '縮尺分母'
			},
			{
				key: '市区町村コード',
				label: '市区町村コード'
			},
			{
				key: '市区町村名',
				label: '市区町村名'
			},
			{
				key: '大字コード',
				label: '大字コード'
			},
			{
				key: '丁目コード',
				label: '丁目コード'
			},
			{
				key: '小字コード',
				label: '小字コード'
			},
			{
				key: '予備コード',
				label: '予備コード'
			},
			{
				key: '大字名',
				label: '大字名'
			},
			{
				key: '地番',
				label: '地番'
			},
			{
				key: '精度区分',
				label: '精度区分'
			},
			{
				key: '座標値種別',
				label: '座標値種別'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.5,
		minZoom: 14,
		colors: {
			show: true,
			key: '単色',
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#ffff99',
						pattern: null
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#d7301f',
			width: 1,
			lineStyle: 'solid'
		},
		labels: {
			key: '地番',
			show: false,
			expressions: [
				{
					key: '座標系',
					name: '座標系'
				},
				{
					key: '測地系判別',
					name: '測地系判別'
				},
				{
					key: '地図名',
					name: '地図名'
				},
				{
					key: '地図番号',
					name: '地図番号'
				},
				{
					key: '縮尺分母',
					name: '縮尺分母'
				},
				{
					key: '市区町村コード',
					name: '市区町村コード'
				},
				{
					key: '市区町村名',
					name: '市区町村名'
				},
				{
					key: '大字コード',
					name: '大字コード'
				},
				{
					key: '丁目コード',
					name: '丁目コード'
				},
				{
					key: '小字コード',
					name: '小字コード'
				},
				{
					key: '予備コード',
					name: '予備コード'
				},
				{
					key: '大字名',
					name: '大字名'
				},
				{
					key: '地番',
					name: '地番'
				},
				{
					key: '精度区分',
					name: '精度区分'
				},
				{
					key: '座標値種別',
					name: '座標値種別'
				}
			]
		}
	},
	auxiliaryLayers: {
		layers: [
			{
				id: 'houmushou_regist-daihyo',
				type: 'heatmap',
				source: 'houmushou_regist_source',
				'source-layer': 'daihyo',
				minzoom: 2,
				maxzoom: 14,
				paint: {
					'heatmap-color': [
						'interpolate',
						['linear'],
						['heatmap-density'],
						0,
						'rgba(255,255,255,0)',
						1,
						'rgba(254, 192, 192, 0.5)'
					],
					'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'], 2, 8, 14, 64]
				}
			}
		]
	}
};

export default entry;
