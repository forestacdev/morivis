import { geoJsonEntry } from '$routes/map/data/vector/geojson';
import { fgbEntry } from '$routes/map/data/vector/fgb';
import type { GeoJsonEntry } from '$routes/map/data/vector/geojson';

export type VectorFormatType = 'geojson' | 'mvt' | 'pmtiles' | 'fgb';

export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'Label';

export interface VectorFormat {
	type: VectorFormatType;
	geometryType?: GeometryType;
	url: string;
}

export interface VectorProperties {
	keys: string[];
	dict: string | null;
}

export interface VectorInteraction {
	clickable: boolean;
	searchKeys: string[];
}

export type VectorEntry = GeoJsonEntry;

export const vectorEntry: VectorEntry = { ...geoJsonEntry, ...fgbEntry };
