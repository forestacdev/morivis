import type { VectorStyle } from '$routes/map/data/vector/style';

import type { Region } from '$routes/map/data/location';
import type { GeoDataType } from '..';

export type VectorFormatType = 'geojson' | 'mvt' | 'pmtiles' | 'fgb';

export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'Label';

export interface VectorFormat {
	type: VectorFormatType;
	geometryType: GeometryType;
	url: string;
}

export interface VectorProperties {
	keys: string[];
	dict: string | null;
}

export interface VectorMetaData {
	name: string;
	description: string;
	attribution: string;
	location: Region;
	minZoom: number;
	maxZoom: number;
	sourceLayer: string;
	bounds: [number, number, number, number] | null;
}

export interface VectorInteraction {
	clickable: boolean;
	searchKeys: string[];
}

interface GeoJsonMetaData {
	name: string;
	description: string;
	attribution: string;
	location: Region;
	minZoom: number;
	maxZoom: number;
	bounds: [number, number, number, number] | null;
}

export interface GeoJsonEntry {
	id: string;
	type: GeoDataType;
	format: VectorFormat;
	metaData: GeoJsonMetaData;
	properties: VectorProperties;
	interaction: VectorInteraction;
	style: VectorStyle;
	debug: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	extension: any;
}

export interface VectorEntry {
	id: string;
	type: GeoDataType;
	format: VectorFormat;
	metaData: VectorMetaData;
	properties: VectorProperties;
	interaction: VectorInteraction;
	style: VectorStyle;
	debug: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	extension: any;
}
