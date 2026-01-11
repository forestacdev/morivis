import type { RasterCadStyle, RasterPMTilesEntry } from '$routes/map/data/types/raster';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/interaction';
import { ENTRY_PMTILES_RASTER_PATH } from '$routes/constants';

const entry: RasterPMTilesEntry<RasterCadStyle> = {
	id: 'ziriki_floor_plan',
	type: 'raster',
	format: {
		type: 'pmtiles',
		url: `${ENTRY_PMTILES_RASTER_PATH}/ziriki_floor_plan.pmtiles`
	},
	metaData: {
		name: '自力建設 平面図',
		description: '',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 14,
		maxZoom: 22,
		tileSize: 512,
		tags: ['施設平面図', 'CAD'],
		bounds: [136.91667640766101, 35.55211495963528, 136.92327872792745, 35.55616329974087],
		xyzImageTile: { x: 3692375, y: 1653443, z: 22 }
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
