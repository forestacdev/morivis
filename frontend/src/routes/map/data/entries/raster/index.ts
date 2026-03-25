import {
	DEFAULT_RASTER_BASEMAP_STYLE,
	DEFAULT_RASTER_DEM_STYLE
} from '$routes/map/data/entries/raster/_style';
import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';

import type {
	RasterEntry,
	RasterBaseMapStyle,
	RasterDemStyle,
	RasterPMTilesEntry,
	DemDataTypeKey,
	WmsTimeDimension
} from '$routes/map/data/types/raster';

import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import { findCenterTile } from '$routes/map/utils/map';

export const createRasterEntry = (
	name: string,
	url: string,
	options?: {
		tileSize?: number;
		minZoom?: number;
		maxZoom?: number;
		bounds?: [number, number, number, number];
		wmsTimeDimension?: { values: string[] };
	}
): RasterEntry<RasterBaseMapStyle> => {
	const wmsTimeDimension: WmsTimeDimension | undefined = options?.wmsTimeDimension
		? {
				values: options.wmsTimeDimension.values,
				currentIndex: 0
			}
		: undefined;

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
			tileSize: (options?.tileSize ?? 256) as 256 | 512,
			minZoom: options?.minZoom ?? 0,
			maxZoom: options?.maxZoom ?? 24,
			bounds: options?.bounds ?? WEB_MERCATOR_WORLD_BBOX
		},
		interaction: {
			...DEFAULT_RASTER_BASEMAP_INTERACTION
		},
		style: {
			...DEFAULT_RASTER_BASEMAP_STYLE,
			...(wmsTimeDimension && { timeDimension: wmsTimeDimension })
		}
	};

	return entry;
};

export const createDemRasterEntry = (
	name: string,
	url: string,
	options?: {
		tileSize?: number;
		minZoom?: number;
		maxZoom?: number;
		bounds?: [number, number, number, number];
		demType?: DemDataTypeKey;
	}
): RasterEntry<RasterDemStyle> => ({
	id: 'dem_' + crypto.randomUUID(),
	type: 'raster',
	format: {
		type: 'image',
		url
	},
	metaData: {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		tileSize: (options?.tileSize ?? 256) as 256 | 512,
		minZoom: options?.minZoom ?? 0,
		maxZoom: options?.maxZoom ?? 24,
		bounds: options?.bounds ?? WEB_MERCATOR_WORLD_BBOX
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_DEM_STYLE,
		visualization: {
			...DEFAULT_RASTER_DEM_STYLE.visualization,
			demType: options?.demType ?? 'gsi'
		}
	}
});

export const createPmtilesEntry = (
	name: string,
	url: string,
	options?: { bounds?: [number, number, number, number]; minZoom?: number; maxZoom?: number }
): RasterPMTilesEntry<RasterBaseMapStyle> => ({
	id: 'pmtiles_' + crypto.randomUUID(),
	type: 'raster',
	format: {
		type: 'pmtiles',
		url
	},
	metaData: {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		tileSize: 256,
		minZoom: options?.minZoom ?? 0,
		maxZoom: options?.maxZoom ?? 24,
		bounds: options?.bounds ?? WEB_MERCATOR_WORLD_BBOX,
		xyzImageTile: options?.bounds ? findCenterTile(options.bounds) : { x: 0, y: 0, z: 0 }
	},
	interaction: {
		...DEFAULT_RASTER_BASEMAP_INTERACTION
	},
	style: {
		...DEFAULT_RASTER_BASEMAP_STYLE
	}
});
