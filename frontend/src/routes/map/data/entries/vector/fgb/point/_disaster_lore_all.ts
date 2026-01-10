import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';
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
		downloadUrl: 'https://github.com/gsi-cyberjapan/experimental_landformclassification'
		// mapImage: `${MAP_IMAGE_BASE_PATH}/experimental_landformclassification1.webp`
	},
	properties: {
		keys: [
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
		dict: {
			ID: 'ID',
			LoreName: '碑名',
			LoreYear: '建立年',
			Address: '所在地',
			DisasterName: '災害名',
			DisasterKind: '災害種別',
			DisasterInfo: '伝承内容',
			ReleaseDate: '公開日',
			ModifyReleaseDate: '更新日',
			Limitations: '制約事項'
		},
		imageKey: 'Image'
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
					name: 'ID',
					value: '{ID}'
				},
				{
					key: 'LoreName',
					name: 'LoreName',
					value: '{LoreName}'
				},
				{
					key: 'LoreYear',
					name: 'LoreYear',
					value: '{LoreYear}'
				},
				{
					key: 'Address',
					name: 'Address',
					value: '{Address}'
				},
				{
					key: 'DisasterName',
					name: 'DisasterName',
					value: '{DisasterName}'
				},
				{
					key: 'DisasterKind',
					name: 'DisasterKind',
					value: '{DisasterKind}'
				},
				{
					key: 'DisasterInfo',
					name: 'DisasterInfo',
					value: '{DisasterInfo}'
				},
				{
					key: 'ReleaseDate',
					name: 'ReleaseDate',
					value: '{ReleaseDate}'
				},
				{
					key: 'ModifyReleaseDate',
					name: 'ModifyReleaseDate',
					value: '{ModifyReleaseDate}'
				},
				{
					key: 'Limitations',
					name: 'Limitations',
					value: '{Limitations}'
				},
				{
					key: 'Image',
					name: 'Image',
					value: '{Image}'
				},
				{
					key: 'ImageWidth',
					name: 'ImageWidth',
					value: '{ImageWidth}'
				},
				{
					key: 'ImageHeight',
					name: 'ImageHeight',
					value: '{ImageHeight}'
				},
				{
					key: 'id',
					name: 'id',
					value: '{id}'
				}
			]
		}
	}
};

export default entry;
