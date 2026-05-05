import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gsi_nendophoto',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://cyberjapandata.gsi.go.jp/xyz/nendophoto{time}/{z}/{x}/{y}.png'
	},
	metaData: {
		name: '年度別航空写真',
		sourceDataName: '年度別空中写真（2007年以降）',
		downloadUrl: 'https://maps.gsi.go.jp/development/ichiran.html#seamlessphoto',
		attribution: '国土地理院',
		location: '全国',
		tags: ['写真'],
		minZoom: 14, // 1
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: IMAGE_TILE_XYZ_SETS['zoom_15'],
		bounds: WEB_MERCATOR_JAPAN_BOUNDS
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE,
		timeDimension: {
			values: [
				'2024',
				'2023',
				'2022',
				'2021',
				'2020',
				'2019',
				'2018',
				'2017',
				'2016',
				'2015',
				'2014',
				'2013',
				'2012',
				'2011',
				'2010',
				'2009',
				'2008',
				'2007'
			],
			currentIndex: 11
		}
	}
};

export default entry;
