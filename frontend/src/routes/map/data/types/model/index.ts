import type { BaseMetaData, Opacity } from '$routes/map/data/types';
import type {
	ColorMapType,
	RasterDiscreteDimension,
	RasterDimensionState
} from '$routes/map/data/types/raster';

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
	min: number;
	max: number;
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

export type MeshFormatType = 'gltf' | 'obj';

export interface ModelMeshEntry<T> extends BaseModelEntry {
	format: {
		type: MeshFormatType;
		url: string;
		mtlUrl?: string;
	};
	style: T;
}

export interface ModelTiles3DEntry<T> extends BaseModelEntry {
	format: {
		type: '3d-tiles';
		url: string;
	};
	style: T;
}

export interface ModelPointCloudEntry extends BaseModelEntry {
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

export type AnyModelMeshEntry = ModelMeshEntry<MeshStyle> | ModelMeshEntry<PointCloudStyle>;

export type AnyModelTiles3DEntry =
	| ModelTiles3DEntry<MeshStyle>
	| ModelTiles3DEntry<PointCloudStyle>;

export type MeshStyleEntry = ModelMeshEntry<MeshStyle> | ModelTiles3DEntry<MeshStyle>;
export type PointCloudStyleEntry =
	| ModelMeshEntry<PointCloudStyle>
	| ModelTiles3DEntry<PointCloudStyle>
	| ModelPointCloudEntry;

export type AnyModelEntry = AnyModelMeshEntry | AnyModelTiles3DEntry | ModelPointCloudEntry;
