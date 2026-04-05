import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
import { NIIGATA_NAGAOKA_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'niigata_nagaoka_satellite',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://forestgeo.info/opendata/15_niigata/nagaoka/orthophoto_2024/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '長岡市 航空写真',
		sourceDataName: '林野庁・簡易オルソ画像（長岡地域2024）',
		attribution: '林野庁',
		location: '新潟県',
		tags: ['写真'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: NIIGATA_NAGAOKA_BBOX,
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-orthophoto-nagaoka2024',
		xyzImageTile: { x: 116178, y: 50794, z: 17 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
