import type { GeoJsonMetaData, VectorEntry } from '$routes/map/data/types/vector';
import { FEATURE_IMAGE_BASE_PATH, ENTRY_FGB_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';

const entry: VectorEntry<GeoJsonMetaData> = {
	id: 'ensyurin_pole',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Point',
		url: `${ENTRY_FGB_PATH}/ensyurin_pole.fgb`
	},
	metaData: {
		name: '林内サインポール',
		description:
			'演習林内とその周辺に設置されている赤いポール。緊急時の集合場所としての目印として使われる。',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		tags: ['看板'],
		maxZoom: 17,
		minZoom: 1,
		bounds: [136.919359, 35.549761, 136.926759, 35.557836],
		xyzImageTile: { x: 57693, y: 25835, z: 16 },
		coverImage: `${FEATURE_IMAGE_BASE_PATH}/pole_3.webp`,
		mapImage: `${MAP_IMAGE_BASE_PATH}/ensyurin_pole.webp`
	},
	properties: {
		keys: ['name'],

		titles: [
			{
				conditions: ['name'],
				template: '{name}'
			},
			{
				conditions: [],
				template: 'サインポール'
			}
		]
	},
	interaction: {
		clickable: true
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
						value: '#e31a1c'
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
			key: '名前',
			show: false,
			expressions: [
				{
					key: '名前',
					name: 'ポールの名前',
					value: '{name}'
				}
			]
		}
	}
};

export default entry;
