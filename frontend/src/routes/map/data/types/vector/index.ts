import type {
	PolygonStyle,
	LineStringStyle,
	PointStyle
} from '$routes/map/data/types/vector/style';

import type { BaseMetaData } from '$routes/map/data/types';
import type { AuxiliaryLayersData } from '$routes/map/data/types/index';

import type { VectorProperties } from '$routes/map/data/types/vector/properties';

export type VectorFormatType =
	| 'geojson'
	| 'mvt'
	| 'pmtiles'
	| 'mbtiles'
	| 'fgb'
	| 'geojsontile'
	| 'esri-feature';

export type VectorEntryGeometryType = 'Point' | 'LineString' | 'Polygon';

export interface VectorInteraction {
	clickable: boolean;
}

export interface VectorTemporalFilterState {
	enabled: boolean;
	startIndex: number;
	endIndex: number;
	mode?: 'range' | 'single_start';
}

export interface VectorEntryState {
	temporalFilter?: VectorTemporalFilterState;
}

export interface TileMetaData extends BaseMetaData {
	promoteId?: string;
	sourceLayer: string;
}

export type GeoJsonMetaData = BaseMetaData;

interface BaseVectorEntry {
	id: string;
	type: 'vector';
	properties: VectorProperties;
	interaction: VectorInteraction;
	state?: VectorEntryState;
}

export interface PolygonEntry<T> extends BaseVectorEntry {
	metaData: T;
	format: {
		type: VectorFormatType;
		geometryType: 'Polygon';
		url: string;
	};
	style: PolygonStyle;
	auxiliaryLayers?: AuxiliaryLayersData;
}

export interface LineStringEntry<T> extends BaseVectorEntry {
	metaData: T;
	format: {
		type: VectorFormatType;
		geometryType: 'LineString';
		url: string;
	};
	style: LineStringStyle;
	auxiliaryLayers?: AuxiliaryLayersData;
}

export interface PointEntry<T> extends BaseVectorEntry {
	metaData: T;
	format: {
		type: VectorFormatType;
		geometryType: 'Point';
		url: string;
	};
	style: PointStyle;
	auxiliaryLayers?: AuxiliaryLayersData;
}

export type VectorEntry<T> = PolygonEntry<T> | LineStringEntry<T> | PointEntry<T>;
