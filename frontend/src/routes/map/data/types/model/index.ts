import type { BaseMetaData, Opacity } from '$routes/map/data/types';

interface ModelMetaData extends BaseMetaData {
	altitude?: number;
}

interface BaseModelEntry {
	id: string;
	type: 'model';
	metaData: ModelMetaData;
	interaction: {
		clickable: boolean;
	};
}

export interface MeshStyle {
	type: 'mesh';
	opacity: Opacity;
	visible?: boolean;
	wireframe: boolean;
	color: string;
	transform: {
		lng: number;
		lat: number;
		altitude: number;
		/** 高さオフセット（常に適用、地形時はaltitude+heightOffset） */
		heightOffset: number;
		scale: number;
		rotationY: number;
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
