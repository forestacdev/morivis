import type { VectorStyle } from '$routes/map/data/vector/style';

import type { Region } from '$routes/map/data/location';
import type { GeoDataType } from '..';

export type VectorFormatType = 'geojson' | 'mvt' | 'pmtiles' | 'fgb';

export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'Label';

// GeometryとStyleのペア型を定義
type GeometryStyleMapping =
	| { geometryType: 'LineString'; style: LineStyle }
	| { geometryType: 'Polygon'; style: PolygonStyle }
	| { geometryType: 'Point'; style: PointStyle }
	| { geometryType: 'Label'; style: LabelStyle };

// Format型の基本構造
interface FormatVectorBase {
	type: VectorFormatType;
	geometryType: GeometryType;
	url: string;
}

// 各スタイルの型定義
interface BaseStyle {
	opacity: number;
}

// Format型を定義
export type VectorFormat = Omit<GeometryStyleMapping, 'style'> & FormatVectorBase;

interface PolygonStyle extends BaseStyle {
	type: 'fill' | 'line' | 'circle';
}

interface LineStyle extends BaseStyle {
	type: 'line' | 'circle';
}

interface PointStyle extends BaseStyle {
	type: 'circle';
}

interface LabelStyle extends BaseStyle {
	type: 'symbol';
}

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
	attribution: string;
	location: Region;
	minZoom: number;
	maxZoom: number;
	sourceLayer: string;
	bounds: [number, number, number, number] | null;
}

export interface GeoJsonMetaData {
	name: string;
	description: string;
	attribution: string;
	location: Region;
	maxZoom: number;
	bounds: [number, number, number, number] | null;
}

export interface VectorEntry<T> {
	id: string;
	type: GeoDataType;
	format: VectorFormat;
	metaData: T;
	properties: VectorProperties;
	interaction: VectorInteraction;
	style: Extract<GeometryStyleMapping, { geometryType: typeof format.geometryType }>['style']; // Formatから派生;
	debug: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	extension: any;
}
