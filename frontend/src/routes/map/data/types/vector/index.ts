import type {
	PolygonStyle,
	LineStringStyle,
	PointStyle,
	LabelStyle
} from '$map/data/types/vector/style';
import type { Region } from '$map/data/types/location';
import type { AttributionKey } from '$map/data/attribution';

export type VectorFormatType = 'geojson' | 'mvt' | 'pmtiles' | 'fgb';

export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'Label';

export interface VectorProperties {
	keys: string[];
	dict: string | null;
}

export interface VectorInteraction {
	clickable: boolean;
	searchKeys: string[];
}

export interface TileMetaData {
	name: string;
	description: string;
	attribution: AttributionKey;
	location: Region;
	minZoom: number;
	maxZoom: number;
	sourceLayer: string;
	bounds: [number, number, number, number] | null;
}

export interface GeoJsonMetaData {
	name: string;
	description: string;
	attribution: AttributionKey;
	location: Region;
	maxZoom: number;
	bounds: [number, number, number, number] | null;
}

interface BaseVectorEntry {
	id: string;
	type: 'vector';
	properties: VectorProperties;
	interaction: VectorInteraction;
	debug: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	extension: any;
}

export interface PolygonEntry<T> extends BaseVectorEntry {
	metaData: T;
	format: {
		type: VectorFormatType;
		geometryType: 'Polygon';
		url: string;
	};
	style: PolygonStyle;
}

export interface LineStringEntry<T> extends BaseVectorEntry {
	metaData: T;
	format: {
		type: VectorFormatType;
		geometryType: 'LineString';
		url: string;
	};
	style: LineStringStyle;
}

export interface PointEntry<T> extends BaseVectorEntry {
	metaData: T;
	format: {
		type: VectorFormatType;
		geometryType: 'Point';
		url: string;
	};
	style: PointStyle;
}

export interface LabelEntry<T> extends BaseVectorEntry {
	metaData: T;
	format: {
		type: VectorFormatType;
		geometryType: 'Label';
		url: string;
	};
	style: LabelStyle;
}

export type VectorEntry<T> = PolygonEntry<T> | LineStringEntry<T> | PointEntry<T> | LabelEntry<T>;
