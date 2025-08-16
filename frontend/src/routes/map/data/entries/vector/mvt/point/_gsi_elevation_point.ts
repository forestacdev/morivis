import { COVER_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import type { VectorEntry, TileMetaData, PointEntry } from '$routes/map/data/types/vector/index';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: PointEntry<TileMetaData> = {
	id: 'gsi_elevation_point',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Point',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '標高点',
		attribution: '国土地理院',
		downloadUrl: 'https://github.com/gsi-cyberjapan/optimal_bvmap',
		location: '全国',
		sourceLayer: 'Anno',
		coverImage: `${COVER_IMAGE_BASE_PATH}/gsi_elevation_point.webp`,
		minZoom: 4,
		maxZoom: 16,
		tags: [],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS
	},
	properties: {
		keys: ['vt_code', 'vt_text'],
		titles: [
			{
				conditions: [],
				template: '標高点'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'circle',
		opacity: 0.8, // 透過率
		markerType: 'circle',
		colors: {
			show: true,
			key: '単色',
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#ffffff'
					}
				}
			]
		},
		radius: {
			key: '単一',
			expressions: [
				{
					type: 'single',
					key: '単一',
					name: '単一',
					mapping: {
						value: 8
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#000000',
			width: 2
		},
		labels: {
			key: 'vt_text',
			show: true,
			expressions: [
				{
					key: 'vt_text',
					name: '標高値',
					value: '{vt_text}'
				}
			]
		},
		default: {
			circle: {
				paint: {},
				layout: {},
				filter: ['==', ['get', 'vt_code'], 7201]
			},
			symbol: {
				paint: {},
				layout: {},
				filter: ['==', ['get', 'vt_code'], 7201]
			},
			heatmap: {
				paint: {},
				layout: {},
				filter: ['==', ['get', 'vt_code'], 7201]
			}
		}
	}
};

export default entry;
