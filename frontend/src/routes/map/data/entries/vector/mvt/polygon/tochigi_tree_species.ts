import { MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { TOCHIGI_BBOX } from '$routes/map/data/location_bbox';
import { TREE_MATCH_COLOR_STYLE } from '$routes/map/data/style';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'tochigi_tree_species',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/tree_species/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '栃木県 樹種ポリゴン',
		attribution: '栃木県森林資源データ',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/tree_species_tochigi',
		location: '栃木県',
		tags: ['森林', '林相図'],
		minZoom: 8,
		maxZoom: 18,
		sourceLayer: 'tree_species_tochigi',
		bounds: TOCHIGI_BBOX,
		xyzImageTile: { x: 29096, y: 12791, z: 15 },
		mapImage: `${MAP_IMAGE_BASE_PATH}/tochigi_tree_species.webp`
	},
	properties: {
		keys: [
			'解析樹種ID',
			'解析樹種',
			'樹種ID',
			'樹種',
			'面積_ha',
			'森林計測年',
			'森林計測法',
			'県code',
			'市町村code',
			'年度'
		],
		titles: [
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: '栃木県の樹種ポリゴン'
			}
		],
		cityCodeKey: '市町村code'
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.5,
		colors: {
			key: '解析樹種',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#33a02c',
						pattern: null
					}
				},
				{
					...TREE_MATCH_COLOR_STYLE
				},
				{
					type: 'step',
					key: '面積_ha',
					name: '面積ごとの色分け',
					mapping: {
						scheme: 'BuGn',
						range: [0, 200],
						divisions: 5
					}
				}
			]
		},
		outline: {
			show: false,
			color: '#000000',
			width: 1,
			lineStyle: 'solid'
		},
		labels: {
			key: '樹種',
			show: false,
			expressions: [
				{
					key: '樹種',
					name: '樹種',
					value: '{樹種}'
				},
				{
					key: '解析樹種ID',
					name: '解析樹種ID',
					value: '{解析樹種ID}'
				},
				{
					key: '解析樹種',
					name: '解析樹種',
					value: '{解析樹種}'
				},
				{
					key: '樹種ID',
					name: '樹種ID',
					value: '{樹種ID}'
				},
				{
					key: '面積_ha',
					name: '面積',
					value: '{面積_ha} ha'
				},
				{
					key: '森林計測年',
					name: '森林計測年',
					value: '{森林計測年}'
				},
				{
					key: '森林計測法',
					name: '森林計測法',
					value: '{森林計測法}'
				},
				{
					key: '県code',
					name: '県code',
					value: '{県code}'
				},
				{
					key: '市町村code',
					name: '市町村code',
					value: '{市町村code}'
				},
				{
					key: '年度',
					name: '年度',
					value: '{年度}'
				}
			]
		},
		default: {
			symbol: {
				paint: {
					'text-color': '#000000',
					'text-halo-color': '#FFFFFF',
					'text-halo-width': 1,
					'text-opacity': 1
				},
				layout: {
					'text-max-width': 12,
					'text-size': 12,
					'text-padding': 10
				}
			}
		}
	}
};

export default entry;
