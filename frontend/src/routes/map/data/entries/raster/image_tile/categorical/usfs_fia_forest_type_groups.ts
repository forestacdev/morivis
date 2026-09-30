import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterCategoricalStyle, RasterImageEntry } from '$routes/map/data/types/raster';

// 配信元の凡例記号の色と順序。名称は森林タイプのグループを表す。
// https://tiles.arcgis.com/tiles/gGHDlz6USftL5Pau/arcgis/rest/services/CONUSForestTypeGroups/MapServer/legend?f=pjson
const FOREST_TYPES = [
	['#bfd730', 'ハンノキ類・カエデ類'],
	['#e2e419', 'アスペン・カバノキ類'],
	['#bd4b9c', 'カリフォルニアの針葉樹混交林'],
	['#009ce0', 'ダグラスファー'],
	['#ffde00', 'ニレ類・トネリコ類・ポプラ類'],
	['#004512', '外来広葉樹'],
	['#9c1f87', '外来針葉樹'],
	['#12479f', 'モミ類・トウヒ類・マウンテンヘムロック'],
	['#532b90', 'ツガ類・シトカトウヒ'],
	['#45c9f5', 'テーダマツ・ショートリーフパイン'],
	['#192b7c', 'ロッジポールパイン'],
	['#7ed3f7', 'ダイオウショウ・スラッシュパイン'],
	['#fff200', 'カエデ類・ブナ類・カバノキ類'],
	['#ffc207', 'オーク・ガム・サイプレス類（Oak/Gum/Cypress）'],
	['#f79419', 'オーク類・ヒッコリー類'],
	['#ee192b', 'オーク類・マツ類'],
	['#009147', 'その他の米国西部の広葉樹'],
	['#c887ba', 'その他の米国西部の針葉樹'],
	['#00b6f1', 'ピニョンマツ類・ビャクシン類'],
	['#007dc5', 'ポンデローサマツ'],
	['#9f76b5', 'セコイア（Redwood）'],
	['#abe1fa', 'トウヒ類・モミ類'],
	['#00a651', 'タンオーク・ローレル類'],
	['#006e47', '熱帯広葉樹'],
	['#7c5aa6', 'ウエスタンラーチ'],
	['#8cc640', '米国西部のオーク類'],
	['#0060b0', 'ウエスタンホワイトパイン'],
	['#c8ebfc', 'ホワイト・レッド・ジャックパイン']
] as const;

const entry: RasterImageEntry<RasterCategoricalStyle> = {
	id: 'usfs_fia_forest_type_groups',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tiles.arcgis.com/tiles/gGHDlz6USftL5Pau/arcgis/rest/services/CONUSForestTypeGroups/MapServer/tile/{z}/{y}/{x}'
	},
	metaData: {
		name: '米国本土 森林タイプ図（USFS FIA）',
		sourceDataName: 'USDA Forest Service / FIA Forest Type Group: All Forest Types',
		description:
			'森林調査と衛星画像などから推定した、米国本土の28区分の森林タイプ図。樹種のグループごとの森林分布を確認するために利用できる。',
		attribution:
			'USDA Forest Service, Forest Inventory and Analysis Program / Ruefenacht et al. (2008)',
		location: '世界',
		tags: ['森林', '植生図', '樹種'],
		// tileInfo.lodsの定義範囲ではなく、配信元の実キャッシュ範囲minLOD/maxLODを使用。
		minZoom: 0,
		maxZoom: 10,
		tileSize: 256,
		// 配信元のfullExtent（Web Mercator）をWGS84へ変換した範囲。
		bounds: [-127.958438, 22.807565, -65.261381, 51.650939],
		downloadUrl: 'https://www.arcgis.com/home/item.html?id=ec147f9df4664c83abc61ec6fa9b7736',
		xyzImageTile: { x: 11, y: 24, z: 6 }
	},
	interaction: { clickable: false },
	style: {
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		resampling: 'nearest',
		legend: {
			type: 'category',
			name: '森林タイプ（USFS FIA・28分類）',
			colors: FOREST_TYPES.map(([color]) => color),
			labels: FOREST_TYPES.map(([, label]) => label)
		}
	}
};

export default entry;
