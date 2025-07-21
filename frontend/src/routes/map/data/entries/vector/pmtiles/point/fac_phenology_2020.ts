import { COVER_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import type { VectorEntry, TileMetaData, PointEntry } from '$routes/map/data/types/vector/index';
const entry: PointEntry<TileMetaData> = {
	id: 'fac_phenology_2020',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Point',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/fac_phenology_2020.pmtiles`
	},
	metaData: {
		name: 'フェノロジー調査 2020年度',
		description: '森林環境教育専攻のフェノロジー調査のデータ',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		sourceLayer: 'fac_phenology_2020',
		minZoom: 10,
		maxZoom: 14,
		tags: ['フェノロジー'],
		bounds: [136.918075, 35.554408333333335, 136.9268, 35.55841111111111],
		coverImage: `${COVER_IMAGE_BASE_PATH}/phenology_2020.webp`
	},
	properties: {
		keys: ['種名'],

		titles: [
			{
				conditions: ['種名'],
				template: '{種名}'
			},
			{
				conditions: [],
				template: 'フェノロジー調査_2020のポイント'
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
						value: '#33ec00'
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
			key: '種名',
			show: false,
			expressions: [
				{
					key: '種名',
					name: '種名',
					value: '{種名}'
				}
			]
		},
		default: {
			circle: {
				paint: {},
				layout: {}
			},
			symbol: {
				paint: {},
				layout: {}
			},
			heatmap: {
				paint: {},
				layout: {}
			}
		}
	}
};

export default entry;
