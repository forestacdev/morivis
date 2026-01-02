import type { BaseMetaData, Opacity } from '$routes/map/data/types';

interface ModelMetaData extends BaseMetaData {
	altitude: number;
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
	type: 'mash';
	opacity: Opacity;
	visible?: boolean;
	wireframe: boolean;
	color: string;
}

export interface PointCloudStyle {
	type: 'point-cloud';
	opacity: Opacity;
	visible?: boolean;
	pointSize?: number;
}

export type MeshFormatType = 'gltf';

export interface ModelMeshEntry<T> extends BaseModelEntry {
	format: {
		type: MeshFormatType;
		url: string;
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

export type AnyModelMeshEntry = ModelMeshEntry<MeshStyle> | ModelMeshEntry<PointCloudStyle>;

export type AnyModelTiles3DEntry =
	| ModelTiles3DEntry<MeshStyle>
	| ModelTiles3DEntry<PointCloudStyle>;

export type AnyModelEntry = AnyModelMeshEntry | AnyModelTiles3DEntry;
