import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';
import { TREE_MATCH_COLOR_STYLE } from '$routes/map/data/style';
import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'national_forest_stand',
	type: 'vector',
	format: {
		type: 'mvt',
		geometryType: 'Polygon',
		url: 'https://raw.githubusercontent.com/forestacdev/tiles-national-forest-stand/main/tiles/{z}/{x}/{y}.pbf'
	},
	metaData: {
		name: '国有林 小班区画',
		attribution: '林野庁',
		description: '林野庁の「国有林GISデータ」の「小班区画」をベクトルタイルに加工したもの',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/a45',
		location: '全国',
		tags: ['林班図', '国有林'],
		minZoom: 0,
		maxZoom: 14,
		sourceLayer: 'national_forest_stand',
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_7
	},
	properties: {
		keys: [
			'ID',
			'森林管理局',
			'森林管理署',
			'林班主番',
			'林班枝番',
			'小班主番',
			'小班枝番',
			'局名称',
			'署名称',
			'小班名',
			'林小班名称',
			'材積',
			'国有林名',
			'担当区',
			'県市町村',
			'樹種１',
			'樹立林齢１',
			'樹種２',
			'樹立林齢２',
			'樹種３',
			'樹立林齢３',
			'計画区',
			'林種の細分',
			'機能類型',
			'面積',
			'保安林１',
			'保安林２',
			'保安林３',
			'保安林４',
			'樹立年度'
		],
		titles: [
			{
				conditions: ['樹種'],
				template: '国有林 {樹種}'
			},
			{
				conditions: [],
				template: '国有林'
			}
		]
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
						value: '#349f1c',
						pattern: null
					}
				},
				{
					type: 'step',
					key: '面積_ha',
					name: '面積ごとの色分け',
					mapping: {
						range: [0, 200],
						divisions: 5,
						values: ['#e0f7fa', '#ed006e']
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
					key: 'ID',
					name: 'ID',
					value: '{ID}'
				},
				{
					key: '森林管理局',
					name: '森林管理局',
					value: '{森林管理局}'
				},
				{
					key: '森林管理署',
					name: '森林管理署',
					value: '{森林管理署}'
				},
				{
					key: '林班主番',
					name: '林班主番',
					value: '{林班主番}'
				},
				{
					key: '林班枝番',
					name: '林班枝番',
					value: '{林班枝番}'
				},
				{
					key: '小班主番',
					name: '小班主番',
					value: '{小班主番}'
				},
				{
					key: '小班枝番',
					name: '小班枝番',
					value: '{小班枝番}'
				},
				{
					key: '局名称',
					name: '局名称',
					value: '{局名称}'
				},
				{
					key: '署名称',
					name: '署名称',
					value: '{署名称}'
				},
				{
					key: '小班名',
					name: '小班名',
					value: '{小班名}'
				},
				{
					key: '林小班名称',
					name: '林小班名称',
					value: '{林小班名称}'
				},
				{
					key: '材積',
					name: '材積',
					value: '{材積}'
				},
				{
					key: '国有林名',
					name: '国有林名',
					value: '{国有林名}'
				},
				{
					key: '担当区',
					name: '担当区',
					value: '{担当区}'
				},
				{
					key: '県市町村',
					name: '県市町村',
					value: '{県市町村}'
				},
				{
					key: '樹種１',
					name: '樹種１',
					value: '{樹種１}'
				},
				{
					key: '樹立林齢１',
					name: '樹立林齢１',
					value: '{樹立林齢１}'
				},
				{
					key: '樹種２',
					name: '樹種２',
					value: '{樹種２}'
				},
				{
					key: '樹立林齢２',
					name: '樹立林齢２',
					value: '{樹立林齢２}'
				},
				{
					key: '樹種３',
					name: '樹種３',
					value: '{樹種３}'
				},
				{
					key: '樹立林齢３',
					name: '樹立林齢３',
					value: '{樹立林齢３}'
				},
				{
					key: '計画区',
					name: '計画区',
					value: '{計画区}'
				},
				{
					key: '林種の細分',
					name: '林種の細分',
					value: '{林種の細分}'
				},
				{
					key: '機能類型',
					name: '機能類型',
					value: '{機能類型}'
				},
				{
					key: '面積',
					name: '面積',
					value: '{面積}'
				},
				{
					key: '保安林１',
					name: '保安林１',
					value: '{保安林１}'
				},
				{
					key: '樹立年度',
					name: '樹立年度',
					value: '{樹立年度}'
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
