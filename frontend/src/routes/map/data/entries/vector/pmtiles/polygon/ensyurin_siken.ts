import { COVER_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';

import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';

const entry: VectorEntry<TileMetaData> = {
	id: 'ensyurin_siken',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/ensyurin.pmtiles`
	},
	metaData: {
		name: '演習林 試験地',
		description: '森林文化アカデミー演習林の試験地。',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		maxZoom: 17,
		minZoom: 8,
		tags: ['森林'],
		sourceLayer: 'ensyurin_sikenfgb',
		bounds: [136.920084, 35.549852, 136.925498, 35.554401],
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin_siken.webp`
	},
	properties: {
		keys: ['活用内容', '活用期間', '番号'],
		titles: [
			{
				conditions: ['活用内容', '活用期間'],
				template: '{活用内容} {活用期間}'
			},
			{
				conditions: ['活用内容'],
				template: '{活用内容}'
			},
			{
				conditions: [],
				template: '演習林林班'
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
			key: '単色',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#377eb8'
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#000000',
			width: 1,
			lineStyle: 'solid'
		},
		labels: {
			key: '活用内容', // 現在選択されているラベルのキー
			show: true, // ラベル表示状態ルの色
			expressions: [
				{
					key: '活用内容',
					name: '活用内容',
					value: '{活用内容}'
				},
				{
					key: '活用期間',
					name: '活用期間',
					value: '{活用期間}'
				}
			]
		}
	}
};

export default entry;
