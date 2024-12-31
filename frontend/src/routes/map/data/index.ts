import { vectorEntry } from '$routes/map/data/vector';
import type { VectorEntry } from '$routes/map/data/vector';

export type GeoDataType = 'raster' | 'vector' | '3d';

export type GeoDataEntry = VectorEntry;

export const geoDataEntry: GeoDataEntry = {
	...vectorEntry
};

// Map に変換

// export const GeoDataIndex = new Map<string, GeoJsonEntry[keyof GeoJsonEntry]>(
// 	Object.entries(GeoDataEntry) as [string, GeoJsonEntry[keyof GeoJsonEntry]][]
// );
