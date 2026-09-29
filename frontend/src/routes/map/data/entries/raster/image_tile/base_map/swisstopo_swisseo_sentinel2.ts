import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'swisstopo_swisseo_sentinel2',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ch.swisstopo.swisseo_s2-sr_v200&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE'
	},
	metaData: {
		name: 'スイス Sentinel-2衛星画像（swisstopo・最新観測）',
		sourceDataName: 'swisstopo swissEO S2-SR v200 / Copernicus Sentinel-2',
		description:
			'Sentinel-2の最新観測を自然色で配信する、スイスとリヒテンシュタイン周辺の衛星画像。観測された地域の地表や積雪を確認でき、表示範囲と雲の状況は観測ごとに変わる。',
		attribution: '© swisstopo / Contains modified Copernicus Sentinel data',
		location: '世界',
		tags: ['写真', '背景地図'],
		minZoom: 0,
		// RGBの解像度10mに合わせた表示上限。WMSには固定のズームレベルがない。
		maxZoom: 14,
		tileSize: 256,
		// WMS GetCapabilitiesの対象レイヤーが示す範囲。
		bounds: [3.329595, 44.074747, 14.278255, 49.200438],
		downloadUrl: 'https://www.swisstopo.admin.ch/en/satelliteimage-swisseo-s2-sr',
		// 観測軌道によって表示範囲が変わるため、スイス全域を含むタイルを使う。
		xyzImageTile: { x: 16, y: 11, z: 5 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
