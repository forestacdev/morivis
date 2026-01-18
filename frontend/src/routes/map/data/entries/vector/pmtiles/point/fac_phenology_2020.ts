import { COVER_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import type { TileMetaData, PointEntry } from '$routes/map/data/types/vector/index';
import { DEFAULT_POINT_LABEL_STYLE } from '../../_style';
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
		maxZoom: 18,
		tags: ['フェノロジー'],
		bounds: [136.918075, 35.554408, 136.9268, 35.558411],
		coverImage: `${COVER_IMAGE_BASE_PATH}/fac_phenology_2020.webp`,
		// mapImage: `${MAP_IMAGE_BASE_PATH}/fac_phenology_2020.webp`,
		xyzImageTile: { x: 230773, y: 103338, z: 18 }
	},
	properties: {
		fields: [
			{
				key: '種名',
				label: '種名',
				type: 'string'
			},
			{
				key: '分類',
				label: '分類',
				type: 'string'
			}
		],
		attributeView: {
			popupKeys: ['種名', '分類'],
			titles: [
				{
					conditions: ['種名'],
					template: '{種名}'
				},
				{
					conditions: [],
					template: 'フェノロジー調査_2020のポイント'
				}
			],
			relations: {
				iNaturalistNameKey: '種名'
			}
		}
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
						value: '#ff7f00'
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
			show: true,
			minZoom: 12,
			expressions: [
				{
					key: '種名',
					name: '種名'
				},
				{
					key: '分類',
					name: '分類'
				}
			]
		},
		default: {
			symbol: DEFAULT_POINT_LABEL_STYLE
		}
	}
};

export default entry;
