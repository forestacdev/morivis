interface BasemapImageTile {
	Z: number;
	X: number;
	Y: number;
}

export const BASEMAP_IMAGE_TILE: BasemapImageTile = {
	Z: 15,
	X: 28846,
	Y: 12917
};

export const GEOJSON_BASE_PATH =
	'https://raw.githubusercontent.com/forestacdev/ensyurin-webgis-data/main/geojson';
export const GIFU_DATA_BASE_PATH =
	'https://raw.githubusercontent.com/forestacdev/gifu-dataset/main/data';

export const EXCLUDE_IDS_CLICK_LAYER = ['HighlightFeatureId', 'HighlightFeatureId_line'];
export const INT_ADD_LAYER_IDS = [
	// 'TITEN',
	'ensyurin_pole',
	'ensyurin_road',
	'ensyurin_rinhan',
	'mino_geology'
	// 'ZIRIKI',
	// 'custom-rgb-dem'
	// 'custom-gsi-dem',
	// 'gsi-rinya_m',
	// 'ortho_photo'
];
