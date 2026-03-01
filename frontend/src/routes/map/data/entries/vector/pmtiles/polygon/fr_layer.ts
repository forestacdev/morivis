import { MAP_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';

import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'fr_layer',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/fr_layer.pmtiles `
	},
	metaData: {
		name: '森林計画対象森林',
		description:
			'国有林野の管理経営に関する法律（昭和26年法律第246号）第２条第１項に定める国有林野（以下「国有林野」という。）及び森林法第５条第１項に定める地域森林計画の対象となっている民有林（以下「民有林」という。）の区域を示すデータ。',
		attribution: '林野庁',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/layer',
		location: '全国',
		maxZoom: 16,
		minZoom: 6,
		tags: ['森林', '林班'],
		sourceLayer: 'fr_layer',
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		mapImage: `${MAP_IMAGE_BASE_PATH}/fr_layer.webp`,
		xyzImageTile: { x: 1803, y: 804, z: 11 }
	},
	properties: {
		attributeView: {
			relations: {
				cityCodeKey: '市町村コード5桁'
			},
			popupKeys: [
				'森林管理局名称',
				'森林管理署等名称',
				'森林計画区名称',
				'林班',
				'広域流域名称',
				'民国別',
				'都道府県名称',
				'市町村名称',
				'旧市町村',
				'都道府県コード',
				'市町村コード3桁',
				'市町村コード5桁',
				'森林計画区コード',
				'データ時点'
			],
			titles: [
				{
					conditions: ['林班'],
					template: '{林班} - {森林計画区名称}'
				}
			]
		},
		fields: [
			{
				key: '森林管理局名称',
				type: 'string',
				label: '森林管理局名称'
			},
			{
				key: '森林管理署等名称',
				type: 'string',
				label: '森林管理署等名称'
			},
			{
				key: '森林計画区コード',
				type: 'string',
				label: '森林計画区コード'
			},
			{
				key: '森林計画区名称',
				type: 'string',
				label: '森林計画区名称'
			},
			{
				key: '林班',
				type: 'string',
				label: '林班'
			},
			{
				key: '都道府県コード',
				type: 'string',
				label: '都道府県コード'
			},
			{
				key: '都道府県名称',
				type: 'string',
				label: '都道府県名称'
			},
			{
				key: '市町村コード3桁',
				type: 'string',
				label: '市町村コード3桁'
			},
			{
				key: '市町村コード5桁',
				type: 'string',
				label: '市町村コード5桁'
			},
			{
				key: '市町村名称',
				type: 'string',
				label: '市町村名称'
			},
			{
				key: '広域流域名称',
				type: 'string',
				label: '広域流域名称'
			},
			{
				key: 'データ時点',
				type: 'string',
				label: 'データ時点'
			},
			{
				key: '民国別',
				type: 'string',
				label: '民国別'
			}
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'fill',
		opacity: 0.5, // 透過率
		colors: {
			key: '民国別',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#33a02c'
					}
				},
				{
					type: 'match',
					key: '民国別',
					name: '民国別',
					mapping: {
						categories: ['国有林', '民有林'],
						values: ['#33a02c', '#1f78b4'],
						patterns: [null, null]
					}
				},
				{
					type: 'match',
					key: '森林管理局名称',
					name: '森林管理局ごとの色分け',
					mapping: {
						categories: [
							'北海道森林管理局',
							'東北森林管理局',
							'関東森林管理局',
							'九州森林管理局',
							'中部森林管理局',
							'近畿中国森林管理局',
							'四国森林管理局'
						],
						values: ['#33a02c', '#1f78b4', '#e31a1c', '#ff7f00', '#6a3d9a', '#b15928', '#b2df8a'],
						patterns: [null, null, null, null, null, null, null]
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#ffffff',
			width: 0.5,
			minZoom: 10,
			lineStyle: 'solid'
		},
		labels: {
			key: '林班',
			show: true,
			minZoom: 12,
			expressions: [
				{
					key: '森林管理局名称',
					name: '森林管理局名称'
				},
				{
					key: '森林管理署等名称',
					name: '森林管理署等名称'
				},
				{
					key: '森林計画区コード',
					name: '森林計画区コード'
				},
				{
					key: '森林計画区名称',
					name: '森林計画区名称'
				},
				{
					key: '林班',
					name: '林班'
				},
				{
					key: '都道府県コード',
					name: '都道府県コード'
				},
				{
					key: '都道府県名称',
					name: '都道府県名称'
				},
				{
					key: '市町村コード3桁',
					name: '市町村コード3桁'
				},
				{
					key: '市町村コード5桁',
					name: '市町村コード5桁'
				},
				{
					key: '市町村名称',
					name: '市町村名称'
				},
				{
					key: '広域流域名称',
					name: '広域流域名称'
				},
				{
					key: 'データ時点',
					name: 'データ時点'
				},
				{
					key: '民国別',
					name: '民国別'
				}
			]
		}
	}
};

export default entry;
