import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import type { RasterBaseMapStyle, RasterImageEntry } from '$routes/map/data/types/raster';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_20210701_heavyrain',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/{morivis:dimension}/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '令和3年7月1日からの大雨 正射画像（熱海伊豆山地区）',
		sourceDataName:
			'令和3年7月1日からの大雨 正射画像・正射画像（速報） 熱海伊豆山地区（7/6撮影）',
		description:
			'令和3年7月1日からの大雨の後、2021年7月6日に静岡県熱海市伊豆山地区を撮影した正射画像。通常版と速報版を切り替え、撮影時点の地表や土石流の状況を確認する際に利用できる。',
		attribution: '国土地理院',
		downloadUrl: 'https://www.gsi.go.jp/BOUSAI/R3_0701_heavyrain.html',
		location: '静岡県',
		tags: ['写真', '土砂災害', '土石流'],
		minZoom: 10,
		maxZoom: 18,
		tileSize: 256,
		// 低ズームの配信画像の外周に余裕を持たせた範囲。
		bounds: [139.00, 35.07, 139.13, 35.17],
		center: [139.078717, 35.116021],
		xyzImageTile: { x: 29043, y: 12966, z: 15 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	state: {
		dimension: { currentIndex: 0 }
	},
	properties: {
		temporal: {
			dimension: {
				type: 'variant',
				values: ['20210705oame_0706do', '20210705oame_0706do_sokuho'],
				labels: ['正射画像（2021年7月6日撮影）', '正射画像・速報（2021年7月6日撮影）'],
				placeholder: '画像を選択'
			}
		}
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
