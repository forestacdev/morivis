import type { RasterPMTilesEntry } from '$routes/data/types/raster';
import { ENTRY_PMTILES_RASTER_PATH } from '$routes/constants';
import type { RasterBaseMapStyle } from '$routes/data/types/raster';
import {
	DEFAULT_RASTER_BASEMAP_INTERACTION,
	DEFAULT_RASTER_BASEMAP_STYLE
} from '$routes/data/style';

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
		tileSize: 512
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
};

export default entry;
