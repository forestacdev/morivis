export type GeoDataType = 'raster' | 'vector' | '3d';
import { vectorEntry } from '$routes/map/data/vector';
import type { VectorEntry } from '$routes/map/data/vector';
import type { GeoJsonEntry } from '$routes/map/data/vector/geojson';

export const GeoDataEntry = {
	...vectorEntry
};
// Map に変換
const geoJsonMap = new Map<string, GeoJsonEntry>(Object.entries(geoJsonPolygonEntry));
