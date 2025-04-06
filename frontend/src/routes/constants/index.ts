import type { PopupOptions, LngLatBoundsLike } from 'maplibre-gl';
import type { TileXYZ } from '$routes/data/types/raster';

export const BASE_PATH = import.meta.env.VITE_BASE_PATH;
export const DATA_PATH = BASE_PATH + '/data';
export const ENTRY_DATA_PATH = DATA_PATH + '/entry';
export const ENTRY_COG_DATA_PATH = ENTRY_DATA_PATH + '/cog';
export const ENTRY_FGB_PATH = ENTRY_DATA_PATH + '/fgb';
export const ENTRY_PMTILES_RASTER_PATH = ENTRY_DATA_PATH + '/pmtiles/raster';
export const ENTRY_PMTILES_VECTOR_PATH = ENTRY_DATA_PATH + '/pmtiles/vector';
export const COVER_IMAGE_BASE_PATH = DATA_PATH + '/images/cover';
export const FEATURE_IMAGE_BASE_PATH = DATA_PATH + '/images/feature';
export const STREET_VIEW_DATA_PATH = DATA_PATH + '/streetview';
export const FONT_DATA_PATH = DATA_PATH + '/font';
export const MAP_FONT_DATA_PATH = FONT_DATA_PATH + '/{fontstack}/{range}.pbf';
export const COVER_NO_IMAGE_PATH = DATA_PATH + '/images/cover/no_image.webp';
export const FEATURE_NO_IMAGE_PATH = DATA_PATH + '/images/feature/no_image.webp';

/** ハイライトさせるレイヤーの色 */
export const HIGHLIGHT_LAYER_COLOR = '#00d4fe';

export interface MapPosition {
	center: [number, number];
	zoom: number;
	pitch: number;
	bearing: number;
	bounds?: LngLatBoundsLike;
}

/* スマホ判定の幅 */
export const MOBILE_WIDTH = 1024;

/** マップの初期位置 */
export const MAP_POSITION: MapPosition = {
	center: [136.923004009, 35.5509525769706],
	zoom: 16,
	pitch: 60,
	bearing: 118
	// bounds: [136.91278, 35.543576, 136.92986, 35.556704]
};

/** アイコン用画像タイルのXYZ */
export const IMAGE_TILE_XYZ: TileXYZ = {
	x: 28846,
	y: 12917,
	z: 15
};

/** maplibreのデフォルトのpopupオプション */
export const MAPLIBRE_POPUP_OPTIONS: PopupOptions = {
	closeButton: false,
	maxWidth: 'none',
	anchor: 'bottom'
};

/** クリックさせないlayerのid */
export const EXCLUDE_IDS_CLICK_LAYER = ['HighlightFeatureId', 'HighlightFeatureId_line'];

/** 初期表示のレイヤーid */
export const INT_ADD_LAYER_IDS = [
	// 'ensyurin_owl',
	// 'cog_test',
	// 'ensyurin_pole',
	'fac_ziriki_point',
	'fac_building_point',
	'fac_poi',
	'ensyurin_road2',
	'gsi_road',
	'ensyurin_rinhan',
	// 'dem_5a',
	// 'gifu_sugi_kansetugai',
	// 'gifu_slope_map',
	'gsi_rinya_m',
	'gsi_seamlessphoto'

	// 'gsi_std'
];
