import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gifu_cs_map',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://forestgeo.info/opendata/21_gifu/csmap_2023/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: 'CS立体図',
		description:
			'岐阜県森林研究所が整備し、公開した微地形表現図（CS立体図）をマップタイル化したものです。（引用:G空間情報センター）',
		attribution: '岐阜県森林研究所',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-gifu-maptiles',
		location: '岐阜県',
		tags: ['地形', '微地形図'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		bounds: [136.1828594, 34.9090933, 137.8301219, 36.7868122]
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
