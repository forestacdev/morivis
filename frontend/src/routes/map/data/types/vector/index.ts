import type {
	LineStringStyle,
	PointStyle,
	PolygonStyle
} from '$routes/map/data/types/vector/style';

import type { BaseMetaData, SharedDimensionState } from '$routes/map/data/types';
import type { AuxiliaryLayersData } from '$routes/map/data/types/index';

import type { VectorProperties } from '$routes/map/data/types/vector/properties';
import type { FeatureCollection } from '$routes/map/types/geojson';

/** vector entry の取得方式。geometry の分類とは独立して扱う。 */
export type VectorFormatType =
	| 'geojson'
	| 'mvt'
	| 'pmtiles'
	| 'mbtiles'
	| 'fgb'
	| 'geojsontile'
	| 'esri-feature'
	| 'ogc-feature'
	| 'wfs-feature';

/** vector entry の主分類軸。morivis では vector を geometry ベースで分ける。 */
export type VectorEntryGeometryType = 'Point' | 'LineString' | 'Polygon';

export interface VectorInteraction {
	clickable: boolean;
}

export interface VectorRuntimeSource {
	type: 'geojson';
	resolveData: (dimensionValue: string) => Promise<FeatureCollection>;
}

export interface VectorTemporalFilterState {
	enabled: boolean;
	startIndex: number;
	endIndex: number;
	mode?: 'range' | 'single_start';
}

export interface VectorEntryState {
	temporalFilter?: VectorTemporalFilterState;
	dimension?: SharedDimensionState;
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
		runtimeSource?: VectorRuntimeSource;
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
		runtimeSource?: VectorRuntimeSource;
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
		runtimeSource?: VectorRuntimeSource;
	};
	style: PointStyle;
	auxiliaryLayers?: AuxiliaryLayersData;
}

/** 面地物として扱う vector entry。format は取得方式、style は polygon 表現を持つ。 */
export type VectorPolygonEntry<T> = PolygonEntry<T>;
/** 線地物として扱う vector entry。format は取得方式、style は line 表現を持つ。 */
export type VectorLineEntry<T> = LineStringEntry<T>;
/** 点地物として扱う vector entry。format は取得方式、style は point 表現を持つ。 */
export type VectorPointEntry<T> = PointEntry<T>;

/** morivis の vector 系内部モデル。geometry を主分類軸として point / line / polygon に分かれる。 */
export type MorivisVectorEntry<T> =
	| VectorPolygonEntry<T>
	| VectorLineEntry<T>
	| VectorPointEntry<T>;
