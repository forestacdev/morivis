import { DISASTER_LORE_ALL_PATH, MAP_IMAGE_BASE_PATH } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';

import type { PointEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: PointEntry<TileMetaData> = {
	id: 'disaster_lore_all',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Point',
		url: `${DISASTER_LORE_ALL_PATH}/tiles/disaster_lore_all.pmtiles`
	},
	metaData: {
		name: '自然災害伝承碑',
		description: '',
		attribution: '国土地理院',
		location: '全国',
		maxZoom: 14,
		minZoom: 6,
		sourceLayer: 'disaster_lore_all',
		tags: ['自然災害伝承碑'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		promoteId: 'ID',
		xyzImageTile: {
			x: 227,
			y: 100,
			z: 8
		},
		downloadUrl: 'https://www.gsi.go.jp/bousaichiri/denshouhi.html',
		mapImage: `${MAP_IMAGE_BASE_PATH}/disaster_lore_all.webp`,
		coverImage: 'https://www.gsi.go.jp/common/000255441.jpg'
	},
	properties: {
		attributeView: {
			popupKeys: [
				'ID',
				'碑名',
				'建立年',
				'所在地',
				'災害名',
				'災害種別',
				'伝承内容',
				'公開日',
				'修正等公開日',
				'制限事項'
			],
			titles: [
				{
					conditions: ['碑名'],
					template: '{碑名}'
				},
				{
					conditions: [],
					template: '自然災害伝承碑'
				}
			],
			descriptionKey: '伝承内容'
		},
		images: {
			popup: {
				type: 'absolute',
				urlKey: 'image'
			},
			icon: {
				type: 'relative',
				imageIdKey: 'ID',
				urlKey: 'ID',
				baseUrl: `${DISASTER_LORE_ALL_PATH}/icons/`,
				suffix: '.webp'
			}
		},
		fields: [
			{ key: 'ID', type: 'string' },
			{ key: '碑名', type: 'string' },
			{
				key: '建立年',
				type: 'string',
				normalize: [{ type: 'replace', pattern: /<br\s*\/?>/gi, replaceWith: '' }]
			},
			{ key: '所在地', type: 'string' },
			{
				key: '災害名',
				type: 'string',
				normalize: [{ type: 'replace', pattern: /<br\s*\/?>/gi, replaceWith: '' }]
			},
			{ key: '災害種別', type: 'string' },
			{
				key: '伝承内容',
				type: 'string',
				normalize: [{ type: 'replace', pattern: /<br\s*\/?>/gi, replaceWith: '\n' }]
			},
			{ key: '公開日', type: 'string' },
			{
				key: '修正等公開日',
				type: 'string'
			},
			{
				key: '制約事項',
				type: 'string'
			},
			{ key: 'image', type: 'string', label: '画像URL' }
		]
	},
	interaction: {
		clickable: true
	},
	style: {
		type: 'circle',
		opacity: 1,
		colors: {
			show: true,
			key: '単色',
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#e31a1c',
						pattern: null
					}
				}
			]
		},
		imageIcon: {
			show: false
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
			key: '碑名',
			show: false,
			expressions: [
				{
					key: 'ID',
					name: 'ID'
				},
				{
					key: '碑名',
					name: '碑名'
				},
				{
					key: '建立年',
					name: '建立年'
				},
				{
					key: '所在地',
					name: '所在地'
				},
				{
					key: '災害名',
					name: '災害名'
				},
				{
					key: '災害種別',
					name: '災害種別'
				},
				{
					key: '伝承内容',
					name: '伝承内容'
				},
				{
					key: '公開日',
					name: '公開日'
				},
				{
					key: '修正等公開日',
					name: '修正等公開日'
				},
				{
					key: '制約事項',
					name: '制約事項'
				}
			]
		}
	}
};

export default entry;
