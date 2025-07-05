import type { RasterPMTilesEntry } from '$routes/map/data/types/raster';
import { ENTRY_PMTILES_RASTER_PATH } from '$routes/constants';
import type { RasterBaseMapStyle } from '$routes/map/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/map/data/style';

const entry: RasterPMTilesEntry<RasterBaseMapStyle> = {
	id: 'ensyurin_photo',
	type: 'raster',
	format: {
		type: 'pmtiles',
		url: `${ENTRY_PMTILES_RASTER_PATH}/ensyurin_photo.pmtiles`
	},
	metaData: {
		name: '演習林 空中写真',
		description: '演習林周辺の空中写真',
		attribution: '森林文化アカデミー',
		location: '森林文化アカデミー',
		minZoom: 12,
		maxZoom: 17,
		tileSize: 512,
		bounds: [136.9099297801910495, 35.5364170136519988, 136.9431222919548929, 35.5702843101185593]
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
