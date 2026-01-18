import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';

import type { RasterEntry, RasterBaseMapStyle } from '$routes/map/data/types/raster';

import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';

// TODO: タイルサイズ指定
export const createRasterEntry = (name: string, url: string): RasterEntry<RasterBaseMapStyle> => {
	const entry: RasterEntry<RasterBaseMapStyle> = {
		id: 'raster_' + crypto.randomUUID(),
		type: 'raster',
		format: {
			type: 'image',
			url
		},
		metaData: {
			...DEFAULT_CUSTOM_META_DATA,
			name,
			tileSize: 256,
			bounds: WEB_MERCATOR_WORLD_BBOX
		},
		interaction: {
			...DEFAULT_RASTER_BASEMAP_INTERACTION
		},
		style: {
			...DEFAULT_RASTER_BASEMAP_STYLE
		}
	};

	return entry;
};
