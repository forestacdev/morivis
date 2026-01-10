import { COVER_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: '',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/hoge.pmtiles`
	},
	metaData: {
		name: '',
		description: 'カスタムデータ',
		attribution: 'カスタムデータ',
		location: '全国',
		maxZoom: 14,
		minZoom: 1,
		tags: [],
		sourceLayer: 'hoge',
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		coverImage: `${COVER_IMAGE_BASE_PATH}/hoge.webp`,
		xyzImageTile: { x: 0, y: 0, z: 0 }
	},
	properties: {
		keys: [],
		titles: [
			{
				conditions: ['hoge'],
				template: '{hoge}'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.5, // 透過率
		colors: {
			key: '単色',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#33a02c'
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#444444',
			width: 0.5,
			lineStyle: 'solid'
		},
		labels: {
			key: 'hoge',
			show: false,
			expressions: [
				{
					key: 'hoge',
					name: 'hoge',
					value: '{hoge}'
				}
			]
		}
	}
};

export default entry;
