import { COVER_IMAGE_BASE_PATH } from '$routes/constants';
import { TREE_MATCH_COLOR_STYLE } from '$routes/map/data/style';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'hyogo_fr_mesh20m',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://rinya-hyogo.geospatial.jp/2023/rinya/tile/fr_mesh20m/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '兵庫県 森林資源量集計メッシュ',
		attribution: '兵庫県森林資源データ',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/fr_mesh20m_hyogo',
		location: '兵庫県',
		tags: ['森林', 'メッシュ'],
		minZoom: 13,
		maxZoom: 16,
		sourceLayer: 'fr_mesh20m_hyogo',
		bounds: [134.252809, 34.156129, 135.468591, 35.674667],
		xyzImageTile: { x: 57274, y: 25978, z: 16 },
		center: [134.651168, 34.897842],
		coverImage: `${COVER_IMAGE_BASE_PATH}/hyogo_fr_mesh20m.webp`
	},
	properties: {
		keys: [
			'解析樹種ID',
			'解析樹種',
			'樹種ID',
			'樹種',
			'面積_ha',
			'立木本数',
			'立木密度',
			'平均樹高',
			'平均直径',
			'合計材積',
			'ha材積',
			'収量比数',
			'相対幹距比',
			'形状比',
			'樹冠長率',
			'森林計測年',
			'森林計測法',
			'平均傾斜',
			'最大傾斜',
			'最小傾斜',
			'最頻傾斜',
			'県code',
			'市町村code',
			'ID',
			'樹冠高90',
			'最大樹冠高'
		],

		titles: [
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: '兵庫県の森林資源メッシュ'
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
			key: '最大樹冠高',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#349f1c'
					}
				},
				{
					...TREE_MATCH_COLOR_STYLE
				},
				{
					type: 'step',
					key: '最大樹冠高',
					name: '最大樹冠高による色分け',
					mapping: {
						range: [1.0, 50],
						divisions: 5,
						values: ['#e6f2ff', '#ff00dd']
					}
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
					key: '立木本数',
					name: '立木本数',
					value: '{立木本数}'
				},
				{
					key: '立木密度',
					name: '立木密度',
					value: '{立木密度}'
				},
				{
					key: '平均樹高',
					name: '平均樹高',
					value: '{平均樹高}'
				},
				{
					key: '平均直径',
					name: '平均直径',
					value: '{平均直径}'
				},
				{
					key: '合計材積',
					name: '合計材積',
					value: '{合計材積}'
				},
				{
					key: 'ha材積',
					name: 'ha材積',
					value: '{ha材積}'
				},
				{
					key: '収量比数',
					name: '収量比数',
					value: '{収量比数}'
				},
				{
					key: '相対幹距比',
					name: '相対幹距比',
					value: '{相対幹距比}'
				},
				{
					key: '形状比',
					name: '形状比',
					value: '{形状比}'
				},
				{
					key: '樹冠長率',
					name: '樹冠長率',
					value: '{樹冠長率}'
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
					key: 'ID',
					name: 'ID',
					value: '{ID}'
				},
				{
					key: '樹冠高90',
					name: '樹冠高90',
					value: '{樹冠高90}'
				},
				{
					key: '最大樹冠高',
					name: '最大樹冠高',
					value: '{最大樹冠高}'
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
