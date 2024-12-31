import { geoJsonEntry } from '$routes/map/data/vector/geojson';
import type { GeoJsonEntry } from '$routes/map/data/vector/geojson';

export type VectorFormatType = 'geojson' | 'mvt' | 'pmtiles' | 'fgb';

export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'Label';

export interface VectorFormat {
	type: VectorFormatType;
	geometryType: GeometryType;
	url: string;
}

export interface VectorProperties {
	keys: string[];
	dict: string;
}

export interface VectorInteraction {
	clickable: boolean;
	searchKeys: string[];
}

export type VectorEntry = GeoJsonEntry;

export const vectorEntry: GeoJsonEntry = { ...geoJsonEntry };
