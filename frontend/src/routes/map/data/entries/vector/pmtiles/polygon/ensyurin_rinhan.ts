import { COVER_IMAGE_BASE_PATH, ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';

import type { VectorEntry, TileMetaData } from '$routes/map/data/types/vector/index';
import chroma from 'chroma-js';

const entry: VectorEntry<TileMetaData> = {
	id: 'ensyurin_rinhan',
	type: 'vector',
	format: {
		type: 'pmtiles',
		geometryType: 'Polygon',
		url: `${ENTRY_PMTILES_VECTOR_PATH}/ensyurin.pmtiles`
	},
	metaData: {
		name: '演習林 林班',
		description: '森林文化アカデミー演習林の林班。',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		tags: ['林班図', '森林'],
		maxZoom: 14,
		minZoom: 8,
		sourceLayer: 'ensyurin_rinhan',
		bounds: [136.91917, 35.54692, 136.926817, 35.555122],
		coverImage: `${COVER_IMAGE_BASE_PATH}/ensyurin.webp`
	},
	properties: {
		keys: ['小林班ID', '樹種', '林齢', '面積', '林班'],

		titles: [
			{
				conditions: ['樹種', '林齢'],
				template: '{樹種}林 {林齢}年生'
			},
			{
				conditions: ['樹種'],
				template: '{樹種}'
			},
			{
				conditions: [],
				template: '演習林林班'
			}
		]
	},
	interaction: {
		// インタラクションの設定
		clickable: true // クリック可能かどうか
	},
	style: {
		type: 'fill',
		opacity: 0.5,
		colors: {
			key: '樹種',
			show: true,
			expressions: [
				{
					type: 'single',
					key: '単色',
					name: '単色',
					mapping: {
						value: '#00ff00'
					}
				},
				{
					type: 'match',
					key: '樹種',
					name: '樹種ごとの色分け',
					mapping: {
						categories: [
							'スギ',
							'ヒノキ',
							'アカマツ',
							'スラッシュマツ',
							'広葉樹',
							'草地',
							'その他岩石'
						],
						values: ['#33a02c', '#b2df8a', '#e31a1c', '#1f78b4', '#fdbf6f', '#a6cee3', '#fb9a99'],
						patterns: [null, null, null, null, null, null, null]
					}
				},
				{
					type: 'match',
					key: '林班',
					name: '林班ごとの色分け',
					mapping: {
						categories: [1, 2, 3],
						values: ['#fbb4ae', '#b3cde3', '#ccebc5']
					}
				},
				{
					type: 'step',
					key: '林齢',
					name: '林齢の範囲による色分け',
					mapping: {
						range: [0, 100],
						divisions: 5,
						values: ['#e5f5f9', '#2ca25f']
					}
				},
				{
					type: 'step',
					key: '面積',
					name: '面積の範囲による色分け',
					mapping: {
						range: [0, 1],
						divisions: 5,
						values: ['#fee8c8', '#e34a33']
					}
				}
			]
		},
		outline: {
			show: true,
			color: '#ffffff',
			width: 2,
			lineStyle: 'dashed'
		},
		labels: {
			key: '樹種', // 現在選択されているラベルのキー
			show: true, // ラベル表示状態の色
			expressions: [
				{
					key: '小林班ID',
					name: '小林班IDのラベル',
					value: '{小林班ID}'
				},
				{
					key: '林齢',
					name: '林齢のラベル',
					value: '{林齢}年生'
				},
				{
					key: '樹種',
					name: '樹種のラベル',
					value: '{樹種}林'
				}
			]
		}
	}
};

export default entry;
