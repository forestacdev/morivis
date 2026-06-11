import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'H30_hokkaido_abira_0911do',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/20180906hokkaido_abira_0911do/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '北海道胆振東部地震 安平地区 空中写真',
		sourceDataName: '北海道胆振東部地震 安平地区 空中写真（2018年9月11日撮影）',
		description: '',
		attribution: '国土地理院',
		downloadUrl: 'https://www.gsi.go.jp/BOUSAI/H30-hokkaidoiburi-east-earthquake-index.html',
		location: '北海道',
		minZoom: 10,
		maxZoom: 18,
		tileSize: 256,
		tags: ['地震', '写真'],
		bounds: [
			141.7475067169999932,
			42.705288742999997,
			142.0180056750000119,
			42.9639444889999993
		],
		xyzImageTile: { x: 29301, y: 12060, z: 15 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
