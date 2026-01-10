import type { GeoJsonMetaData, PointEntry } from '$routes/map/data/types/vector';
import { COVER_IMAGE_BASE_PATH, ENTRY_FGB_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';

const entry: PointEntry<GeoJsonMetaData> = {
	id: 'fac_sisetuannaitou',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Point',
		url: `${ENTRY_FGB_PATH}/fac_sisetuannaitou.fgb`
	},
	metaData: {
		name: '施設案内棟',
		description: '施設案内棟',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 10,
		maxZoom: 22,
		tags: ['看板'],
		bounds: [136.917205, 35.553612, 136.919391, 35.556191],
		xyzImageTile: { x: 115386, y: 51669, z: 17 },
		coverImage: `${COVER_IMAGE_BASE_PATH}/fac_sisetuannaitou.webp`,
		mapImage: `${MAP_IMAGE_BASE_PATH}/fac_sisetuannaitou.webp`
	},
	properties: {
		attributeView: {
			popupKeys: ['name'],
			titles: [
				{
					conditions: [],
					template: '施設案内棟'
				}
			]
		},
		fields: [{ key: 'name', type: 'string' }]
	},
	interaction: {
		clickable: false
	},
	style: {
		type: 'circle',
		opacity: 0.7, // 透過率
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
						value: '#fdb462'
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
			color: '#ffffff',
			width: 2
		},
		labels: {
			key: 'name',
			show: false,
			expressions: [
				{
					key: 'name',
					name: 'name'
				}
			]
		}
	}
};

export default entry;
