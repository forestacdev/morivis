import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'plateau_ortho_2023',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://tile.plateauview.mlit.go.jp/tiles/plateau-ortho-2023/{z}/{x}/{y}.png'
	},
	metaData: {
		name: 'PLATEAU オルソ画像',
		sourceDataName: 'PLATEAU-Ortho（2023年度版）',
		description:
			'PLATEAUが配信するオルソ画像タイルです。整備地域の航空写真を背景地図として表示するときに使います。',
		downloadUrl: 'https://docs.plateauview.mlit.go.jp/datasets/ortho/',
		attribution: 'PLATEAU',
		location: '全国',
		tags: ['写真'],
		minZoom: 10,
		maxZoom: 19,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: { x: 29099, y: 12902, z: 15 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
