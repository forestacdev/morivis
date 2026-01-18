/**
 * 樹種ポリゴンプリセットの使用例
 *
 * このファイルは実際のエントリではなく、使用例のドキュメントです。
 * ファイル名が `_` で始まるため、import.meta.glob では読み込まれません。
 */

import { createTreeSpeciesEntry } from '$routes/map/data/entries/_presets/tree_species';

// ========================================
// 最小限の設定例（必須パラメータのみ）
// ========================================
const minimalExample = createTreeSpeciesEntry({
	id: 'example_tree_species',
	prefecture: '兵庫県',
	url: 'https://example.com/tiles/{z}/{x}/{y}.pbf',
	sourceLayer: 'tree_species_example'
});

// ========================================
// フル設定例
// ========================================
const fullExample = createTreeSpeciesEntry({
	id: 'hyogo_tree_species',
	prefecture: '兵庫県',
	url: 'https://rinya-hyogo.geospatial.jp/2023/rinya/tile/tree_species/{z}/{x}/{y}.pbf',
	sourceLayer: 'tree_species_hyogo',
	attribution: '兵庫県森林資源データ',
	downloadUrl: 'https://www.geospatial.jp/ckan/dataset/tree_species_hyogo',
	zoom: { min: 8, max: 18 },
	xyzImageTile: 'zoom_14',
	// 追加フィールド（基本フィールドに追加される）
	additionalFields: [
		{ key: 'ID', type: 'number' },
		{ key: '樹冠高90', type: 'number', unit: 'm' },
		{ key: '最大樹冠高', type: 'number', unit: 'm' }
	],
	// 追加popupKeys
	additionalPopupKeys: ['ID', '樹冠高90', '最大樹冠高'],
	// 面積カラースケールの範囲
	areaRange: [0, 200],
	opacity: 0.5
});

export { minimalExample, fullExample };
