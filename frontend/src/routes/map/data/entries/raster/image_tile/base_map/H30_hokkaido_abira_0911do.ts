import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'H30_hokkaido_abira_0911do',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/20180906hokkaido_abira_0911do/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '平成30年北海道胆振東部地震 安平地区 正射画像（2018年9月11日撮影）',
		sourceDataName: '平成30年北海道胆振東部地震 安平地区 正射画像（2018年9月11日撮影）',
		description: '',
		attribution: '国土地理院',
		downloadUrl: 'https://www.gsi.go.jp/BOUSAI/H30-hokkaidoiburi-east-earthquake-index.html',
		location: '北海道',
		minZoom: 10,
		maxZoom: 18,
		tileSize: 256,
		tags: ['地震', '写真'],
		bounds: [141.7475067169999932, 42.705288742999997, 142.0180056750000119, 42.9639444889999993],
		xyzImageTile: IMAGE_TILE_XYZ_SETS.zoom_9
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
