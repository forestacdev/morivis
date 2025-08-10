import type { RasterImageEntry, RasterDemStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_DEM_STYLE } from '$routes/map/data/style';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterDemStyle> = {
	id: 'dchm_niigata_nagaoka',
	type: 'raster',
	format: {
		type: 'image',
		url: ''
	},
	metaData: {
		name: '',
		description: '',
		sourceDataName: '',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-dchm-nagaoka2024',
		attribution: 'カスタムデータ',
		tags: [],
		location: '新潟県長岡市',
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
