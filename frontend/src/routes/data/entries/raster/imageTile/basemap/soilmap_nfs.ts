import {
	DEFAULT_RASTER_BASEMAP_STYLE,
	DEFAULT_RASTER_BASEMAP_INTERACTION
} from '$routes/data/style';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'soilmap_nfs',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://www2.ffpri.go.jp/soilmap/tile/nfs/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '国有林林野土壌図',
		description: '国有林林野土壌図',
		attribution: '森林総合研究所',
		downloadUrl: 'https://www2.ffpri.go.jp/soilmap/data-src2.html',
		location: '全国',
		minZoom: 1,
		maxZoom: 16,
		tileSize: 256,
		xyzImageTile: {
			x: 14447,
			y: 6447,
			z: 14
		}
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
