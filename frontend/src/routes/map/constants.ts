import type { PopupOptions } from 'maplibre-gl';
import type { TileXYZ } from '$map/data/types/raster';

// TODO: データのURLを変更する
export const GEOJSON_BASE_PATH =
	'https://raw.githubusercontent.com/forestacdev/ensyurin-webgis-data/main/geojson';
export const GIFU_DATA_BASE_PATH =
	'https://raw.githubusercontent.com/forestacdev/gifu-dataset/main/data';
export const COVER_IMAGE_BASE_PATH = 'http://localhost:5173/images/cover';
export const FEATURE_IMAGE_BASE_PATH = 'http://localhost:5173/images/feature';
export const COVER_NO_IMAGE_PATH = './images/cover/no_image.webp';
export const FEATURE_NO_IMAGE_PATH = './images/feature/no_image.webp';

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
	// 'cog_test',
	'ensyurin_pole',
	'fac_ziriki',
	'fac_building',
	'fac_poi',
	'ensyurin_road',
	'ensyurin_rinhan',
	// 'gifu_sugi_kansetugai',
	// 'gifu_slope_map',
	// 'gsi_slopemap',
	'gsi_seamlessphoto'

	// 'gsi_std'
];
