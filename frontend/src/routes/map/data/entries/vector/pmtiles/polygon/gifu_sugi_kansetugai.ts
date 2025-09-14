import {
	COVER_IMAGE_BASE_PATH,
	ENTRY_PMTILES_VECTOR_PATH,
	MAP_IMAGE_BASE_PATH
} from '$routes/constants';

import type { PolygonEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: PolygonEntry<TileMetaData> = {
	id: 'gifu_sugi_kansetugai',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/gifu_sugi_kansetugai.pmtiles`
	},
	metaData: {
		name: '岐阜県 スギ人工林冠雪害危険度',
		description:
			'岐阜県森林研究所が提供する「岐阜県スギ人工林冠雪害危険度マップ」をベクトルタイル形式に加工したもの',
		downloadUrl: 'https://www.forest.rd.pref.gifu.lg.jp/shiyou/kansetsugaimap.html',
		attribution: '岐阜県森林研究所',
		tags: ['森林'],
		location: '岐阜県',
		xyzImageTile: { x: 901, y: 403, z: 10 },
		maxZoom: 14,
		minZoom: 1,
		sourceLayer: 'gifu_sugi_kansetugai',
		bounds: [136.2750000000000057, 35.1333333333333329, 137.6624999999999943, 36.4666666666666686],
		mapImage: `${MAP_IMAGE_BASE_PATH}/gifu_sugi_kansetugai.webp`
	},
	properties: {
		keys: ['code', '20冬期中の危険日判定', '冠雪害危険日の頻度の目安'],
		titles: [
			{
				conditions: [],
				template: 'スギ人工林冠雪害危険度'
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
			key: '20冬期中の危険日判定',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#ff7f00'
					}
				},
				{
					type: 'match',
					key: '20冬期中の危険日判定',
					name: '20冬期中の危険日判定',
					mapping: {
						categories: ['0日', '1~2日', '3~5日', '6~10日', '11〜15日', '16~20日', '21日以上'],
						values: ['#ffffb2', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#b10026'],
						patterns: [null, null, null, null, null, null, null]
					}
				}
			]
		},
		outline: {
			show: false,
			color: '#444444',
			minZoom: 7,
			width: 0.5,
			lineStyle: 'solid'
		},
		labels: {
			key: '20冬期中の危険日判定', // 現在選択されているラベルのキー
			show: false, // ラベル表示状態ルの色
			expressions: [
				{
					key: 'code',
					name: 'code',
					value: '{code}'
				},
				{
					key: '20冬期中の危険日判定',
					name: '20冬期中の危険日判定',
					value: '{20冬期中の危険日判定}'
				},
				{
					key: '冠雪害危険日の頻度の目安',
					name: '冠雪害危険日の頻度の目安',
					value: '{冠雪害危険日の頻度の目安}'
				}
			]
		}
	}
};

export default entry;
