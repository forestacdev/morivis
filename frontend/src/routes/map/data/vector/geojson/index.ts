import { GEOJSON_BASE_PATH, GIFU_DATA_BASE_PATH } from '$routes/map/constants';
import type { Region } from '$routes/map/data/location';
import type { VectorFormat, VectorProperties, VectorInteraction } from '$routes/map/data/vector';
import type { GeoDataType } from '$routes/map/data';
import { geoJsonPolygonEntry } from '$routes/map/data/vector/geojson/polygon';
import type { VectorStyle } from '$routes/map/data/vector/style';

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
	[id: string]: {
		type: GeoDataType;
		format: VectorFormat;
		metaData: GeoJsonMetaData;
		properties: VectorProperties;
		interaction: VectorInteraction;
		style: VectorStyle;
	};
}

export const geoJsonEntry = { ...geoJsonPolygonEntry };
