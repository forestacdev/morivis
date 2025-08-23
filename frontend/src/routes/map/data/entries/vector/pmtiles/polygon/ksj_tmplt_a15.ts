import { COVER_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';

import type { PolygonEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: PolygonEntry<TileMetaData> = {
	id: 'ksj_tmplt_a15',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/ksj_tmplt_a15.pmtiles`
	},
	metaData: {
		name: '鳥獣保護区',
		description: '国土数値情報より鳥獣保護区（2015年）のデータを加工して作成',
		attribution: '国土数値情報',
		downloadUrl: 'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A15.html',
		location: '全国',
		maxZoom: 14,
		minZoom: 1,
		tags: ['鳥獣保護区'],
		sourceLayer: 'ksj_tmplt_a15',
		bounds: [123.00744367, 24.19197, 153.99083742, 45.45090445],
		xyzImageTile: { x: 903, y: 400, z: 10 },
		coverImage: `${COVER_IMAGE_BASE_PATH}/ksj_tmplt_a15.webp`
	},
	properties: {
		keys: [
			'鳥獣保護区名',
			'都道府県コード',
			'指定機関コード',
			'保護区分コード',
			'指定日',
			'解除日',
			'ID',
			'指定機関',
			'保護区分',
			'都道府県'
		],
		titles: [
			{
				conditions: ['鳥獣保護区名', '保護区分'],
				template: '{鳥獣保護区名} {保護区分}'
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
			key: '保護区分',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#33f543'
					}
				},
				{
					type: 'match',
					key: '保護区分',
					name: '保護区分',
					mapping: {
						categories: ['鳥獣保護区', '特別保護地区', '休猟区', '特例休猟区'],
						values: ['#f55b23', '#f5d133', '#00b4fb', '#50e3c2'],
						patterns: [null, null, null, null]
					},
					noData: {
						value: 'transparent',
						pattern: null
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#444444',
			width: 0.5,
			lineStyle: 'solid'
		},
		labels: {
			key: '鳥獣保護区名', // 現在選択されているラベルのキー
			show: false, // ラベル表示状態ルの色
			expressions: [
				{
					key: '鳥獣保護区名',
					name: '鳥獣保護区名',
					value: '{鳥獣保護区名}'
				},
				{
					key: '都道府県コード',
					name: '都道府県コード',
					value: '{都道府県コード}'
				},
				{
					key: '指定機関コード',
					name: '指定機関コード',
					value: '{指定機関コード}'
				},
				{
					key: '保護区分コード',
					name: '保護区分コード',
					value: '{保護区分コード}'
				},
				{
					key: '指定日',
					name: '指定日',
					value: '{指定日}'
				},
				{
					key: '解除日',
					name: '解除日',
					value: '{解除日}'
				},
				{
					key: 'ID',
					name: 'ID',
					value: '{ID}'
				},
				{
					key: '指定機関',
					name: '指定機関',
					value: '{指定機関}'
				},
				{
					key: '保護区分',
					name: '保護区分',
					value: '{保護区分}'
				},
				{
					key: '都道府県',
					name: '都道府県',
					value: '{都道府県}'
				}
			]
		}
	}
};

export default entry;
