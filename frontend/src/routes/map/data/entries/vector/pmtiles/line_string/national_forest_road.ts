import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import type { TileMetaData, VectorEntry } from '$routes/map/data/types/vector';

const entry: VectorEntry<TileMetaData> = {
	id: 'national_forest_road',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'LineString',
		url: 'https://forestacdev.github.io/tiles-national-forest-road/national_forest_road.pmtiles'
	},
	metaData: {
		name: '国有林 林道',
		attribution: '林野庁',
		description: '林野庁の「国有林GISデータ」の「林道」をベクトルタイルに加工したもの',
		location: '全国',
		tags: ['林道', '国有林'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		maxZoom: 14,
		minZoom: 8,
		sourceLayer: 'national_forest_road',
		xyzImageTile: { x: 3613, y: 1612, z: 12 },
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/a45',
		mapImage: `${MAP_IMAGE_BASE_PATH}/national_forest_road.webp`
	},
	properties: {
		keys: ['種類'],
		titles: []
	},
	interaction: {
		clickable: false
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
					name: '林道名',
					value: '{林道名}'
				}
			]
		},
		default: {
			symbol: {
				paint: {},
				layout: {
					'text-size': 10,
					'symbol-placement': 'line',
					'symbol-spacing': 100
				}
			}
		}
	}
};

export default entry;
