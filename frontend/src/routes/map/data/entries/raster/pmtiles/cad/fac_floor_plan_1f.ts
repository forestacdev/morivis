import type { RasterCadStyle, RasterPMTilesEntry } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/style';
import { ENTRY_PMTILES_RASTER_PATH } from '$routes/constants';

const entry: RasterPMTilesEntry<RasterCadStyle> = {
	id: 'fac_floor_plan_1f',
	type: 'raster',
	format: {
		type: 'pmtiles',
		url: `${ENTRY_PMTILES_RASTER_PATH}/fac_floor_plan_1f.pmtiles`
	},
	metaData: {
		name: 'アカデミー施設 1F 平面図',
		description: '',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 14,
		maxZoom: 22,
		tileSize: 512,
		tags: ['施設平面図', 'CAD'],
		bounds: [136.9173152931533934, 35.5538854123020585, 136.9200990542338729, 35.5559061137465733],
		xyzImageTile: { x: 923093, y: 413358, z: 20 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		type: 'cad',
		opacity: 1.0,
		color: '#aeff00'
	}
};

export default entry;
