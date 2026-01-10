import type { GeoJsonMetaData, PointEntry } from '$routes/map/data/types/vector';
import { COVER_IMAGE_BASE_PATH, ENTRY_FGB_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';

const entry: PointEntry<GeoJsonMetaData> = {
	id: 'ensyurin_kikenboku_h25',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Point',
		url: `${ENTRY_FGB_PATH}/ensyurin_kikenboku_h25.fgb`
	},
	metaData: {
		name: '演習林 危険木調査 2013年度',
		description: '',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 10,
		maxZoom: 22,
		tags: ['森林', '単木'],
		bounds: [136.919727, 35.547376, 136.92669, 35.554887],
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_kikenboku_h25.webp`,
		mapImage: `${MAP_IMAGE_BASE_PATH}/ensyurin_kikenboku_h25.webp`,
		xyzImageTile: { x: 115387, y: 51670, z: 17 }
	},
	properties: {
		attributeView: {
			popupKeys: ['樹種', '胸高直径（ｃｍ）', '状態', '調査日時', '備考'],
			titles: [
				{
					conditions: ['樹種'],
					template: '{樹種}'
				},
				{
					conditions: [],
					template: '危険木'
				}
			]
		},
		fields: [
			{ key: '樹種', type: 'string' },
			{ key: '胸高直径（ｃｍ）', type: 'number', label: '胸高直径', unit: 'cm' },
			{ key: '状態', type: 'string' },
			{ key: '調査日時', type: 'string' },
			{ key: '調査者／調査法', type: 'string' },
			{ key: '備考', type: 'string' }
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
			key: '胸高直径（ｃｍ）',
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#e31a1c'
					}
				},
				{
					type: 'step',
					key: '胸高直径（ｃｍ）',
					name: '胸高直径ごとの色分け',
					mapping: {
						scheme: 'YlOrRd',
						range: [10, 50],
						divisions: 5
					}
				}
			]
		},
		radius: {
			key: '胸高直径（ｃｍ）',
			expressions: [
				{
					type: 'single',
					key: '単一',
					name: '単一',
					mapping: {
						value: 8
					}
				},
				{
					type: 'linear',
					key: '胸高直径（ｃｍ）',
					name: '胸高直径',
					mapping: {
						range: [1, 50],
						values: [5, 10]
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
			key: '樹種',
			show: false,
			expressions: [
				{
					key: '樹種',
					name: '樹種'
				},
				{
					key: '胸高直径（ｃｍ）',
					name: '胸高直径'
				},
				{
					key: '状態',
					name: '状態'
				},
				{
					key: '調査日時',
					name: '調査日時'
				},
				{
					key: '備考',
					name: '備考'
				}
			]
		}
	}
};

export default entry;
