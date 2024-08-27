import type { BasemapImageTile } from '$lib/types/ui';
export const BASEMAP_IMAGE_TILE: BasemapImageTile = {
	Z: 12,
	X: 3605,
	Y: 1614
};

export const GEOJSON_BASE_PATH =
	'https://raw.githubusercontent.com/forestacdev/ensyurin-webgis-data/main/geojson';

export const EXCLUDE_IDS_CLICK_LAYER = ['HighlightFeatureId', 'HighlightFeatureId_line'];
