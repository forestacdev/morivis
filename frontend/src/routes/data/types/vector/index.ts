import type {
	PolygonStyle,
	LineStringStyle,
	PointStyle,
	LabelStyle
} from '$routes/data/types/vector/style';

import type { BaseMetaData } from '$routes/data/types';

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

export interface TileMetaData extends BaseMetaData {
	minZoom: number;
	promoteId?: string;
	sourceLayer: string;
}

export type GeoJsonMetaData = BaseMetaData;

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
