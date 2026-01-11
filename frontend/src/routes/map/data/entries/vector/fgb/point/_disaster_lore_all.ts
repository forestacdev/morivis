import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/meta_data/_bounds';
import { ENTRY_FGB_PATH } from '$routes/constants';

import type { PointEntry, GeoJsonMetaData } from '$routes/map/data/types/vector/index';

const entry: PointEntry<GeoJsonMetaData> = {
	id: 'disaster_lore_all',
	type: 'vector',
	format: {
		type: 'fgb',
		geometryType: 'Point',
		url: `${ENTRY_FGB_PATH}/disaster_lore_all.fgb`
	},
	metaData: {
		name: '自然災害伝承碑',
		description: '',
		attribution: '国土地理院',
		location: '全国',
		maxZoom: 22,
		minZoom: 1,
		// promoteId: 'code',
		tags: ['自然災害伝承碑'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: { x: 225, y: 100, z: 8 },
		downloadUrl: 'https://www.gsi.go.jp/bousaichiri/denshouhi.html'
		// mapImage: `${MAP_IMAGE_BASE_PATH}/experimental_landformclassification1.webp`
	},
	properties: {
		attributeView: {
			popupKeys: [
				'ID',
				'LoreName',
				'LoreYear',
				'Address',
				'DisasterName',
				'DisasterKind',
				'DisasterInfo',
				'ReleaseDate',
				'ModifyReleaseDate',
				'Limitations',
				'Image',
				'ImageWidth',
				'ImageHeight',
				'id'
			],
			titles: [
				{
					conditions: ['LoreName'],
					template: '{LoreName}'
				},
				{
					conditions: [],
					template: '自然災害伝承碑'
				}
			],
			imageKey: 'Image'
		},
		fields: [
			{ key: 'ID', type: 'string', label: 'ID' },
			{ key: 'LoreName', type: 'string', label: '碑名' },
			{ key: 'LoreYear', type: 'string', label: '建立年' },
			{ key: 'Address', type: 'string', label: '所在地' },
			{ key: 'DisasterName', type: 'string', label: '災害名' },
			{ key: 'DisasterKind', type: 'string', label: '災害種別' },
			{ key: 'DisasterInfo', type: 'string', label: '伝承内容' },
			{ key: 'ReleaseDate', type: 'string', label: '公開日' },
			{ key: 'ModifyReleaseDate', type: 'string', label: '更新日' },
			{ key: 'Limitations', type: 'string', label: '制約事項' },
			{ key: 'Image', type: 'string', label: '画像URL' },
			{ key: 'ImageWidth', type: 'number', label: '画像幅' },
			{ key: 'ImageHeight', type: 'number', label: '画像高さ' },
			{ key: 'id', type: 'string', label: 'id' }
		]
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
						value: '#e31a1c'
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
			key: 'LoreName',
			show: false,
			expressions: [
				{
					key: 'ID',
					name: 'ID'
				},
				{
					key: 'LoreName',
					name: 'LoreName'
				},
				{
					key: 'LoreYear',
					name: 'LoreYear'
				},
				{
					key: 'Address',
					name: 'Address'
				},
				{
					key: 'DisasterName',
					name: 'DisasterName'
				},
				{
					key: 'DisasterKind',
					name: 'DisasterKind'
				},
				{
					key: 'DisasterInfo',
					name: 'DisasterInfo'
				},
				{
					key: 'ReleaseDate',
					name: 'ReleaseDate'
				},
				{
					key: 'ModifyReleaseDate',
					name: 'ModifyReleaseDate'
				},
				{
					key: 'Limitations',
					name: 'Limitations'
				},
				{
					key: 'Image',
					name: 'Image'
				},
				{
					key: 'ImageWidth',
					name: 'ImageWidth'
				},
				{
					key: 'ImageHeight',
					name: 'ImageHeight'
				},
				{
					key: 'id',
					name: 'id'
				}
			]
		}
	}
};

export default entry;
