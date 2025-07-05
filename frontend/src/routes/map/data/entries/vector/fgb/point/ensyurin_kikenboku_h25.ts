import type { GeoJsonMetaData, PointEntry } from '$routes/map/data/types/vector';
import { COVER_IMAGE_BASE_PATH, ENTRY_FGB_PATH } from '$routes/constants';

const entry: PointEntry<GeoJsonMetaData> = {
	id: 'ensyurin_kikenboku_h25',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Point',
		url: `${ENTRY_FGB_PATH}/ensyurin_kikenboku_h25.fgb`
	},
	metaData: {
		name: '演習林危険木調査 2013年度',
		description: '',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 10,
		maxZoom: 22,
		bounds: [136.919727, 35.547376, 136.92669, 35.554887],
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_kikenboku_h25.webp`
	},
	properties: {
		keys: ['樹種', '状態'],
		titles: [
			{
				conditions: [],
				template: '{樹種} {状態}'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'circle',
		opacity: 0.8,
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
						value: '#ff0000'
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
					name: 'name',
					value: '{name}'
				}
			]
		}
	}
};

export default entry;
