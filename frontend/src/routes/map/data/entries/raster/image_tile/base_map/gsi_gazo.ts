import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_gazo',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/{morivis:dimension}/{z}/{x}/{y}.jpg'
	},
	metaData: {
		name: '年度別空中写真（1974年〜1990年）',
		sourceDataName:
			'年代別の写真（1987年～1990年, 1984年～1986年, 1979年～1983年, 1974年～1978年）',
		downloadUrl: 'https://maps.gsi.go.jp/help/intro/looklist/2-nendai.html',
		attribution: '国土地理院',
		location: '全国',
		tags: ['写真'],
		minZoom: 7,
		maxZoom: 17,
		tileSize: 256,
		xyzImageTile: { x: 58274, y: 25716, z: 16 },
		bounds: WEB_MERCATOR_JAPAN_BOUNDS
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	state: {
		dimension: {
			currentIndex: 0
		}
	},
	properties: {
		temporal: {
			dimension: {
				type: 'time',
				values: ['gazo4', 'gazo3', 'gazo2', 'gazo1'],
				labels: ['1987年～1990年', '1984年～1986年', '1979年～1983年', '1974年～1978年']
			}
		}
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
