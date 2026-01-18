import type { GeoJsonMetaData, PointEntry } from '$routes/map/data/types/vector';
import { COVER_IMAGE_BASE_PATH, ENTRY_FGB_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { DEFAULT_POINT_LABEL_STYLE } from '../../_style';

const entry: PointEntry<GeoJsonMetaData> = {
	id: 'fac_birds_census_2020',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Point',
		url: `${ENTRY_FGB_PATH}/fac_birds_census_2020.fgb`
	},
	metaData: {
		name: '鳥類調査 2020年度',
		description: '森林環境教育選考「生物同定の基礎」より実施',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 10,
		maxZoom: 22,
		tags: ['鳥類'],
		bounds: [136.9165610000000015, 35.5507500000000007, 136.9230420000000095, 35.5569050000000004],
		mapImage: `${MAP_IMAGE_BASE_PATH}/fac_birds_census_2020.webp`,
		xyzImageTile: { x: 115387, y: 51671, z: 17 },
		coverImage: `${COVER_IMAGE_BASE_PATH}/bird.webp`
	},
	properties: {
		attributeView: {
			popupKeys: ['name', 'time', 'ele'],
			titles: [
				{
					conditions: ['name'],
					template: '{name}'
				},
				{
					conditions: [],
					template: '鳥類'
				}
			],
			relations: {
				iNaturalistNameKey: 'name'
			}
		},
		fields: [
			{
				key: 'ele',
				label: '観測地点標高',
				type: 'number'
			},
			{
				key: 'time',
				label: '観測時間',
				type: 'date',
				format: {
					date: {
						inputPatterns: ['YYYY-MM-DDTHH:mm:ssZ'],
						displayPattern: 'YYYY/MM/DD HH:mm'
					}
				}
			},
			{
				key: 'name',
				label: '種名',
				type: 'string'
			},
			{
				key: 'kashmir3d_icon',
				label: 'kashmir3d_icon'
			},
			{
				key: 'kashmir3d_dir',
				label: 'kashmir3d_dir'
			},
			{
				key: 'id',
				label: 'id'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'circle',
		opacity: 0.7,
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
			show: true,
			expressions: [
				{
					key: 'ele',
					name: 'ele'
				},
				{
					key: 'time',
					name: '時間'
				},
				{
					key: 'name',
					name: '種名'
				}
			]
		},
		default: {
			symbol: DEFAULT_POINT_LABEL_STYLE
		}
	}
};

export default entry;
