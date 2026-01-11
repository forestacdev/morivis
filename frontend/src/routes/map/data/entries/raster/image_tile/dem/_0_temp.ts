import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/entries/raster/style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/meta_data/bounds';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: '',
	type: 'raster',
	format: {
		type: 'image',
		url: ''
	},
	metaData: {
		name: '',
		description: '',
		// sourceDataName:'',
		// downloadUrl: '',
		attribution: 'カスタムデータ',
		tags: [],
		location: '不明',
		minZoom: 1,
		maxZoom: 22,
		tileSize: 256,
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_7, // 画像タイルのXYZ座標
		bounds: WEB_MERCATOR_JAPAN_BOUNDS
	},
	interaction: {
		clickable: true
	},
	style: {
		...DEFAULT_RASTER_DEM_STYLE
	}
};

export default entry;
