import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';
import { WEB_MERCATOR_JAPAN_BOUNDS } from '$routes/map/data/location_bbox';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gbank_seamless',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://gbank.gsj.jp/seamless/v2/api/1.3.1/tiles/{z}/{y}/{x}.png'
	},
	metaData: {
		name: '20万分の1日本シームレス地質図V2',
		description: '',
		downloadUrl: 'https://gbank.gsj.jp/seamless/v2/api/1.3.1/#tiles',
		attribution: '産総研地質調査総合センター',
		tags: ['地質図'],
		location: '全国',
		minZoom: 0,
		maxZoom: 13,
		tileSize: 256,
		bounds: WEB_MERCATOR_JAPAN_BOUNDS,
		xyzImageTile: {
			x: 1827,
			y: 777,
			z: 11
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
