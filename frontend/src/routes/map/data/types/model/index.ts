import type { AdjustableRange, BaseMetaData, Opacity } from '$routes/map/data/types';
import type {
	ColorMapType,
	RasterDimensionState,
	RasterDiscreteDimension
} from '$routes/map/data/types/raster';
import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { Table } from 'apache-arrow';

interface ModelMetaData extends BaseMetaData {
	altitude?: number;
}

export interface ModelAnimationClip {
	name: string;
}

export interface ModelAnimationProperties {
	clips: ModelAnimationClip[];
}

export interface ModelAnimationState {
	currentClipIndex: number;
	playing: boolean;
	speed: number;
}

interface BaseModelEntry {
	id: string;
	type: 'model';
	metaData: ModelMetaData;
	properties?: {
		temporal?: {
			dimension: RasterDiscreteDimension;
		};
		animation?: ModelAnimationProperties;
	};
	interaction: {
		clickable: boolean;
	};
	state?: {
		dimension?: RasterDimensionState;
		animation?: ModelAnimationState;
	};
}

export interface MeshShadingStyle {
	enabled: boolean;
	shadeStrength: number;
	ambientStrength: number;
	azimuthDeg: number;
	elevationDeg: number;
}

export const DEFAULT_MESH_SHADING: MeshShadingStyle = {
	enabled: true,
	shadeStrength: 0.85,
	ambientStrength: 0.35,
	azimuthDeg: 180,
	elevationDeg: 0
};

export interface MeshHeightColorRampStyle {
	enabled: boolean;
	colorMap: ColorMapType;
	range?: AdjustableRange;
	min?: number;
	max?: number;
	sourceMin?: number;
	sourceMax?: number;
	sourceSign?: 1 | -1;
}

export interface MeshTransformOptionStyle {
	scale?: boolean;
	rotation?: boolean;
	heightScale?: boolean;
	heightOffset?: boolean;
}

export interface ProjectedModelGeoreference {
	type: 'projected';
	epsg: string;
	projectedOrigin: [number, number, number];
	unitScaleMeters?: number;
}

export interface MeshShadingOptionStyle {
	enabled?: boolean;
}

export interface MeshStyle {
	type: 'mesh';
	opacity: Opacity;
	visible?: boolean;
	wireframe: boolean;
	color: string;
	shading?: MeshShadingStyle;
	shadingOptions?: MeshShadingOptionStyle;
	heightColorRamp?: MeshHeightColorRampStyle;
	transformOptions?: MeshTransformOptionStyle;
	transform: {
		lng: number;
		lat: number;
		altitude: number;
		/** 高さオフセット（常に適用、地形時はaltitude+heightOffset） */
		heightOffset?: number;
		/** Y 方向だけに効く高さ倍率 */
		heightScale?: number;
		/** UI には出さない読み込み基準のスケール */
		baseScale?: number;
		/** UI には出さない読み込み基準の回転 */
		baseRotationX?: number;
		baseRotationY?: number;
		baseRotationZ?: number;
		scale: number;
		rotationX: number;
		rotationY: number;
		rotationZ: number;
	};
}

export interface PointCloudStyle {
	type: 'point-cloud';
	opacity: Opacity;
	visible?: boolean;
	pointSize: number;
}

export interface GeoArrowStyle {
	type: 'geoarrow';
	opacity: Opacity;
	visible?: boolean;
	color: string;
}

/** mesh 系 model entry の入力形式。主に three.js 側で読む 3D モデル形式を表す。 */
export type MeshFormatType =
	| 'gltf'
	| 'obj'
	| '3ds'
	| 'dae'
	| '3dm'
	| 'fbx'
	| 'drc'
	| '3mf'
	| 'amf'
	| 'ifc';

export interface MeshEntry<T> extends BaseModelEntry {
	format: {
		type: MeshFormatType;
		url: string;
		mtlUrl?: string;
		resourceUrls?: Record<string, string>;
		normalizeToLocalOrigin?: boolean;
		georeference?: ProjectedModelGeoreference;
	};
	style: T;
}

export interface Tiles3DEntry<T> extends BaseModelEntry {
	format: {
		type: '3d-tiles';
		url: string;
	};
	style: T;
}

export interface PointCloudEntry extends BaseModelEntry {
	format: {
		type: 'point-cloud';
		/** Blob URL of the LAS/LAZ file (未変換時) */
		url?: string;
		/** 変換済みの位置データ [x,y,z, x,y,z, ...] */
		positions?: Float32Array;
		/** 色データ [r,g,b, r,g,b, ...] (0-255) */
		colors?: Uint8Array;
		/** 点数 */
		pointCount: number;
	};
	style: PointCloudStyle;
}

export interface GeoArrowEntry extends BaseModelEntry {
	format: {
		type: 'geoarrow';
		table: Table;
		geometryType: VectorEntryGeometryType;
	};
	style: GeoArrowStyle;
}

export interface GeoJson3DEntry extends BaseModelEntry {
	format: {
		type: 'geojson-3d';
		data: FeatureCollection;
		geometryType: VectorEntryGeometryType;
	};
	style: GeoArrowStyle;
}

/** deck.gl 側で扱うベクター系 3D entry。 */
export type DeckVectorEntry = GeoArrowEntry | GeoJson3DEntry;

export type AnyMeshEntry = MeshEntry<MeshStyle> | MeshEntry<PointCloudStyle>;

export type AnyTiles3DEntry =
	| Tiles3DEntry<MeshStyle>
	| Tiles3DEntry<PointCloudStyle>;

export type MeshStyleEntry = MeshEntry<MeshStyle> | Tiles3DEntry<MeshStyle>;
export type PointCloudStyleEntry =
	| MeshEntry<PointCloudStyle>
	| Tiles3DEntry<PointCloudStyle>
	| PointCloudEntry;

/**
 * morivis の model 系内部モデル。
 * object / runtime を主分類軸とし、three.js 系と deck.gl 系の分岐元になる。
 */
export type MorivisModelEntry =
	| AnyMeshEntry
	| AnyTiles3DEntry
	| PointCloudEntry
	| DeckVectorEntry;
