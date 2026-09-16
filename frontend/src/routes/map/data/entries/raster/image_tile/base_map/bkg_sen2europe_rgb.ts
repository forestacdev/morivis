import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'bkg_sen2europe_rgb',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://sgx.geodatenzentrum.de/wms_sen2europe?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=rgb&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE&TIME={morivis:dimension}'
	},
	metaData: {
		name: 'Sen2Europe RGB',
		sourceDataName: 'BKG Sen2Europe / Copernicus Sentinel-2',
		description:
			'Sentinel-2の衛星画像を加工して作成した、ヨーロッパの解像度10mのRGBモザイク画像。2018年・2021年の画像を切り替え、土地被覆の確認や背景地図として利用できる。',
		attribution: `Europäische Union, enthält veränderte Copernicus Sentinel-Daten (${
			new Date().getFullYear()
		}); BKG`,
		location: '世界',
		tags: ['写真', '背景地図'],
		minZoom: 0,
		maxZoom: 14,
		tileSize: 256,
		// WMS GetCapabilitiesのrgbレイヤーが示す地理座標範囲。
		bounds: [-49.277499182871246, 26.18880767272983, 63.310910646937586, 72.16776262337258],
		downloadUrl:
			'https://gdz.bkg.bund.de/index.php/default/wms-europamosaik-aus-sentinel-2-daten-wms-sen2europe.html',
		xyzImageTile: { x: 34, y: 21, z: 6 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	state: {
		dimension: {
			currentIndex: 1
		}
	},
	properties: {
		temporal: {
			dimension: {
				type: 'time',
				values: ['2018-01-01', '2021-01-01'],
				labels: ['2018年', '2021年']
			},
			behaviors: [{ type: 'source' }]
		}
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
