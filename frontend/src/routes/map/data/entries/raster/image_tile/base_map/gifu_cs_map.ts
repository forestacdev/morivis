import type { RasterImageEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/interaction';

const entry: RasterImageEntry<RasterBaseMapStyle> = {
	id: 'gifu_cs_map',
	type: 'raster',
	format: {
		type: 'image',
		url: 'https://forestgeo.info/opendata/21_gifu/csmap_2023/{z}/{x}/{y}.webp'
	},
	metaData: {
		name: '岐阜県 CS立体図',
		attribution: '岐阜県森林研究所',
		downloadUrl: 'https://www.geospatial.jp/ckan/dataset/rinya-gifu-maptiles',
		location: '岐阜県',
		tags: ['地形', '微地形図'],
		minZoom: 8,
		maxZoom: 18,
		tileSize: 256,
		xyzImageTile: { x: 14424, y: 6458, z: 14 },
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
