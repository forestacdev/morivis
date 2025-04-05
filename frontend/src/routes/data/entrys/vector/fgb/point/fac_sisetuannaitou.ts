import type { GeoJsonMetaData, PointEntry } from '$routes/data/types/vector';
import { COVER_IMAGE_BASE_PATH } from '$routes/constants';

const entry: PointEntry<GeoJsonMetaData> = {
	id: 'fac_sisetuannaitou',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Point',
		url: './fgb/fac_sisetuannaitou.fgb'
	},
	metaData: {
		name: '施設案内棟',
		description: '施設案内棟',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		maxZoom: 22,
		bounds: null,
		coverImage: `${COVER_IMAGE_BASE_PATH}/fac_sisetuannaitou.webp`
	},
	properties: {
		keys: [],
		dict: null,
		titles: [
			{
				conditions: [],
				template: '林業専攻-OWL利用研修立木計測データ'
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
						value: '#834f00'
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
