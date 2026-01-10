import type {
	PolygonStyle,
	LineStringStyle,
	PointStyle
} from '$routes/map/data/types/vector/style';

import type { BaseMetaData } from '$routes/map/data/types';
import type { SourceSpecification, LayerSpecification } from 'maplibre-gl';
import type {
	PointFeatureCollection,
	LineStringFeatureCollection,
	PolygonFeatureCollection
} from '$routes/map/types/geojson';

export type VectorFormatType = 'geojson' | 'mvt' | 'pmtiles' | 'fgb' | 'geojsontile';

export type VectorEntryGeometryType = 'Point' | 'LineString' | 'Polygon' | 'Label';

export interface Title {
	conditions: string[];
	template: string;
}

export interface FieldDef {
	key: string;
	label?: string;
	type?: 'string' | 'number' | 'integer';
	unit?: string;
	format?: {
		digits?: number;
		emptyText?: string;
	};
	dict?: Record<number | string, string>;
}

export interface VectorProperties {
	keys: string[];
	fields?: FieldDef[];
	titles: Title[];
	dict?: Record<string, any>;
	joinDataUrl?: string;
	imageKey?: string;
	cityCodeKey?: string;
	iNaturalistNameKey?: string;
}

export interface VectorInteraction {
	clickable: boolean;
}

export interface TileMetaData extends BaseMetaData {
	promoteId?: string;
	sourceLayer: string;
}

export type GeoJsonMetaData = BaseMetaData;

export interface AuxiliaryLayersData {
	// MapLibreのソース定義をそのまま使用
	source: {
		[key: string]: SourceSpecification; // MapLibre SourceSpecification
	};
	// MapLibreのレイヤー定義をそのまま使用
	layers: LayerSpecification[];
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
		data?: PolygonFeatureCollection;
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
		data?: LineStringFeatureCollection;
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
		data?: PointFeatureCollection;
	};
	style: PointStyle;
	auxiliaryLayers?: AuxiliaryLayersData;
}

export type VectorEntry<T> = PolygonEntry<T> | LineStringEntry<T> | PointEntry<T>;
