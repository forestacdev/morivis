import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import type { TileMetaData, VectorEntry } from '$routes/map/data/types/vector';

const entry: VectorEntry<TileMetaData> = {
	id: 'houmushou_regist',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'LineString',
		url: 'https://d2g6co14qozqgp.cloudfront.net/pmtiles/a.pmtiles'
	},
	metaData: {
		name: '法務省登記所備付地図データ',
		attribution: '登記所備付地図データ（法務省）',
		description: '法務省の「登記所備付地図データ」をベクトルタイルに加工したもの',
		location: '全国',
		tags: ['登記所備付地図'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		maxZoom: 14,
		minZoom: 6,
		sourceLayer: 'daihyo',
		xyzImageTile: { x: 3613, y: 1612, z: 12 },
		downloadUrl: 'https://github.com/amx-project/a-spec?tab=readme-ov-file'
		// mapImage: `${MAP_IMAGE_BASE_PATH}/national_forest_road.webp`
	},
	properties: {
		attributeView: {
			popupKeys: [],
			titles: []
		},
		fields: [
			{ key: '林道名', label: '林道名', type: 'string' },
			{ key: '森林管理局', label: '森林管理局', type: 'string' },
			{ key: '森林管理署', label: '森林管理署', type: 'string' },
			{ key: '路線番号', label: '路線番号', type: 'string' },
			{ key: 'ID', label: 'ID', type: 'string' }
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'line',
		opacity: 0.5,
		colors: {
			show: true,
			key: '単色',
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#ffff99'
					}
				}
			]
		},
		width: {
			key: '単一',
			expressions: [
				{
					type: 'single',
					key: '単一',
					name: '単一',
					mapping: {
						value: 5
					}
				}
			]
		},
		lineStyle: 'solid',
		labels: {
			key: '林道名',
			show: false,
			expressions: [
				{
					key: '林道名',
					name: '林道名'
				}
			]
		}
	},
	auxiliaryLayers: {
		layers: [
			{
				id: 'houmushou_regist-fill',
				type: 'fill',
				paint: {
					'fill-color': 'rgba(254,217,192,1)',
					'fill-outline-color': 'rgba(255,0,0,1)'
				},
				source: 'houmushou_regist_source',
				'source-layer': 'daihyo'
			}
		]
	}
};

export default entry;
