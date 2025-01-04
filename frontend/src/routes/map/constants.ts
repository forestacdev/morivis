interface BasemapImageTile {
	x: number;
	y: number;
	z: number;
}

export const BASEMAP_IMAGE_TILE: BasemapImageTile = {
	x: 28846,
	y: 12917,
	z: 15
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
	'gifu_sugi_kansetugai',
	'gsi_std'

	// 'mino_geology'
	// 'ZIRIKI',
	// 'custom-rgb-dem'
	// 'custom-gsi-dem',
	// 'gsi-rinya_m',
	// 'ortho_photo'
];
