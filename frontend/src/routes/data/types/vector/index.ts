import type {
	PolygonStyle,
	LineStringStyle,
	PointStyle,
	LabelStyle
} from '$routes/data/types/vector/style';
import type { Region } from '$routes/data/types/location';
import type { AttributionKey } from '$routes/data/attribution';

export type VectorFormatType = 'geojson' | 'mvt' | 'pmtiles' | 'fgb';

export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'Label';

export interface Title {
	conditions: string[];
	template: string;
}

export interface VectorProperties {
	keys: string[];
	dict: string | null;
	titles: Title[] | null;
}

export interface VectorInteraction {
	clickable: boolean;
}

export interface TileMetaData {
	name: string;
	description: string;
	attribution: AttributionKey;
	location: Region;
	minZoom: number;
	maxZoom: number;
	promoteId?: string;
	sourceLayer: string;
	bounds: [number, number, number, number] | null;
	coverImage: string | null;
}

export interface GeoJsonMetaData {
	name: string;
	description: string;
	attribution: AttributionKey;
	location: Region;
	maxZoom: number;
	bounds: [number, number, number, number] | null;
	coverImage: string | null;
}

interface BaseVectorEntry {
	id: string;
	type: 'vector';
	properties: VectorProperties;
	interaction: VectorInteraction;
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
