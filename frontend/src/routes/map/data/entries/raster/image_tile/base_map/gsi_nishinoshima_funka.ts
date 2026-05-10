import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';

const NISHINOSHIMA_BOUNDS: [number, number, number, number] = [
	140.8636389, 27.2291667, 140.8969444, 27.2708333
];

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_nishinoshima_funka',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/{morivis:dimension}/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '西之島付近噴火活動 正射画像',
		sourceDataName: '西之島付近噴火活動 正射画像',
		description: '西之島付近の噴火活動に伴う地表の状況を記録した正射画像。',
		attribution: '国土地理院',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html',
		location: '東京都',
		minZoom: 10,
		maxZoom: 18,
		tileSize: 256,
		tags: ['写真', '地形'],
		bounds: NISHINOSHIMA_BOUNDS,
		xyzImageTile: { x: 14603, y: 6902, z: 14 },
		center: [140.88029165, 27.25]
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE,
		dimension: {
			type: 'time',
			values: [
				'20131204doh',
				'20131217doh',
				'20140216doh',
				'20140322dol',
				'20140704dol',
				'20141204doh',
				'20141210doh',
				'20150301doh',
				'20150728dol',
				'20151209dol',
				'20160303dol',
				'20160725dol',
				'20161220dol',
				'20180117dol',
				'20220119_nishinoshima_dol',
				'20230202_nishinoshima_dol'
			],
			labels: [
				'2013年12月4日',
				'2013年12月17日',
				'2014年2月16日',
				'2014年3月22日',
				'2014年7月4日',
				'2014年12月4日',
				'2014年12月10日',
				'2015年3月1日',
				'2015年7月28日',
				'2015年12月9日',
				'2016年3月3日',
				'2016年7月25日',
				'2016年12月20日',
				'2018年1月17日',
				'2022年1月19日',
				'2023年2月2日'
			],
			currentIndex: 15
		}
	}
};

export default entry;
