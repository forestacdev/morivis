import type { GeoJsonMetaData, PointEntry } from '$routes/data/types/vector';
import { FEATURE_IMAGE_BASE_PATH } from '$routes/constants';

const entry: PointEntry<GeoJsonMetaData> = {
	id: 'ensyurin_pole',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Point',
		url: './fgb/ensyurin_pole.fgb'
	},
	metaData: {
		name: 'サインポール',
		description: '演習林内のサインポール',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		maxZoom: 22,
		bounds: null,
		coverImage: `${FEATURE_IMAGE_BASE_PATH}/pole_3.webp`
	},
	properties: {
		keys: ['name'],
		dict: null,
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
						value: '#e70000'
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
