export type GeoDataType = 'raster' | 'vector' | '3d';
import { vectorEntry } from '$routes/map/data/vector';
import type { VectorEntry } from '$routes/map/data/vector';
import type { GeoJsonEntry } from '$routes/map/data/vector/geojson';

const geoDataMap: GeoJsonEntry = {
	...vectorEntry
};

export const GeoDataEntry = new Map<string, GeoJsonEntry>(Object.entries(vectorEntry));
