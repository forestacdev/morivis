import { COVER_IMAGE_BASE_PATH } from '$routes/constants';
import { TOCHIGI_BBOX } from '$routes/map/data/location_bbox';
import { TREE_MATCH_COLOR_STYLE } from '$routes/map/data/style';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';
import type { expressions } from 'maplibre-gl';

const entry: VectorEntry<TileMetaData> = {
	id: 'tochigi_fr_mesh20m',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/fr_mesh20m/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '栃木県 森林資源量集計メッシュ',
		attribution: '栃木県森林資源データ',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/fr_mesh20m_tochigi',
		location: '栃木県',
		tags: ['森林', 'メッシュ'],
		minZoom: 13,
		maxZoom: 16,
		sourceLayer: 'fr_mesh20m_tochigi',
		bounds: TOCHIGI_BBOX,
		xyzImageTile: { x: 58224, y: 25564, z: 16 },
		center: [139.833104, 36.723743],
		coverImage: `${COVER_IMAGE_BASE_PATH}/tochigi_fr_mesh20m.webp`
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
			'平均傾斜',
			'最大傾斜',
			'最小傾斜',
			'最頻傾斜',
			'県code',
			'市町村code',
			'メッシュID',
			'平均標高',
			'道から距離',
			'Shape_Length',
			'Shape_Area'
		],

		titles: [
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: '栃木県の森林資源メッシュ'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.7,
		colors: {
			key: '解析樹種',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#349f1c',
						pattern: null
					}
				},
				{
					...TREE_MATCH_COLOR_STYLE
				}
			]
		},
		outline: {
			show: true,
			color: '#000000',
			width: 0.1,
			lineStyle: 'solid'
		},
		labels: {
			key: '樹種',
			show: false,
			expressions: [
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
					key: '樹種',
					name: '樹種',
					value: '{樹種}'
				},
				{
					key: '面積_ha',
					name: '面積_ha',
					value: '{面積_ha}'
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
					key: '平均傾斜',
					name: '平均傾斜',
					value: '{平均傾斜}'
				},
				{
					key: '最大傾斜',
					name: '最大傾斜',
					value: '{最大傾斜}'
				},
				{
					key: '最小傾斜',
					name: '最小傾斜',
					value: '{最小傾斜}'
				},
				{
					key: '最頻傾斜',
					name: '最頻傾斜',
					value: '{最頻傾斜}'
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
					key: 'メッシュID',
					name: 'メッシュID',
					value: '{メッシュID}'
				},
				{
					key: '平均標高',
					name: '平均標高',
					value: '{平均標高}'
				},
				{
					key: '道から距離',
					name: '道から距離',
					value: '{道から距離}'
				},
				{
					key: 'Shape_Length',
					name: 'Shape_Length',
					value: '{Shape_Length}'
				},
				{
					key: 'Shape_Area',
					name: 'Shape_Area',
					value: '{Shape_Area}'
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
					'text-field': ['to-string', ['get', '樹種']],
					'text-max-width': 12,
					'text-size': 12,
					'text-anchor': 'center',
					'text-padding': 10
				}
			}
		}
	}
};

export default entry;
