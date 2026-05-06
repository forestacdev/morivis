import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_ort',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/{time}/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '年度別空中写真（1928年〜1961年）',
		sourceDataName: '年代別の写真（1961年～1969年, 1945年～1950年, 1936年～1942年頃, 1928年頃）',
		downloadUrl: 'https://maps.gsi.go.jp/help/intro/looklist/2-nendai.html',
		attribution: '国土地理院',
		location: '全国',
		tags: ['写真'],
		minZoom: 13,
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: { x: 57435, y: 26028, z: 16 },
		center: [135.451186, 34.722772],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE,
		timeDimension: {
			values: ['ort_old10', 'ort_USA10', 'ort_riku10', 'ort_1928'],
			labels: ['1961年～1969年', '1945年～1950年', '1936年～1942年頃', '1928年頃'],
			currentIndex: 0
		}
	}
};

export default entry;
