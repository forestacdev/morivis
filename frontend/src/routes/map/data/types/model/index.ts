import type { AdjustableRange, BaseMetaData, Opacity } from '$routes/map/data/types';
import type { MediaData } from '$routes/map/data/types/details';
import type {
	ColorMapType,
	RasterDimensionState,
	RasterDiscreteDimension
} from '$routes/map/data/types/raster';
import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import type { ColorsStyle } from '$routes/map/data/types/vector/style';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { ModelAttributes } from '$routes/map/utils/three/model-attributes';
import type { Table } from 'apache-arrow';

interface ModelMetaData extends BaseMetaData {
	altitude?: number;
}

export interface ModelAnimationClip {
	name: string;
	/** モデルファイル内に含まれる Three.js のアニメーション。 */
	type?: 'embedded';
}

/** PMX/PMD に適用する MikuMikuDance モーション。 */
export interface VmdModelAnimationClip {
	name: string;
	type: 'vmd';
	url: string;
}

export interface ModelAnimationProperties {
	clips: Array<ModelAnimationClip | VmdModelAnimationClip>;
	/** 初期選択するプリセット。未指定時は先頭。 */
	defaultClipIndex?: number;
	/** 初回表示時に既定プリセットを再生する。 */
	autoPlay?: boolean;
	/** 初回表示時の再生速度。 */
	defaultSpeed?: number;
}

export interface ModelAnimationState {
	currentClipIndex: number;
	playing: boolean;
	speed: number;
}

/** IFC の実体クラスと属性キーを限定して、初期表示用の色分け候補を定義する。 */
export interface IfcPartColorProfile {
	type: 'part-colors';
	elementTypes: string[];
	attributeKeys: string[];
}

export type IfcExtractionProfile = IfcPartColorProfile;

/** GLB の _prop_id で参照する、モデルentry内の部材詳細。 */
export interface ModelPartData {
	name: string;
	description?: string;
	url?: string;
	medias?: MediaData[];
	attributes?: ModelAttributes;
}

export interface ModelEntryProperties {
	temporal?: {
		dimension: RasterDiscreteDimension;
	};
	animation?: ModelAnimationProperties;
	ifc?: {
		extractionProfiles: IfcExtractionProfile[];
	};
	/** GLB のノードに付与した _prop_id ごとの詳細情報。 */
	detailsById?: Record<string, ModelPartData>;
}

interface BaseModelEntry {
	id: string;
	type: 'model';
	metaData: ModelMetaData;
	properties?: ModelEntryProperties;
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
	enabled: false,
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
	coordinateSpace?: 'object' | 'root-children' | 'ifc-z-up';
}

export interface ModelTransformStyle {
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

/** 描画時のローカル座標におけるモデル範囲 [minX, minY, minZ, maxX, maxY, maxZ]。 */
export type ModelLocalBounds = [number, number, number, number, number, number];

export interface MeshStyle extends ModelTransformStyle {
	type: 'mesh';
	opacity: Opacity;
	visible?: boolean;
	wireframe: boolean;
	/** true のとき地形の地下にある部分も前面に表示する。 */
	showThroughTerrain: boolean;
	color: string;
	/** IFC など、モデル内パーツの属性を使う色分け設定。 */
	partColors?: ColorsStyle;
	shading?: MeshShadingStyle;
	heightColorRamp?: MeshHeightColorRampStyle;
	transformOptions?: MeshTransformOptionStyle;
}

/** 通常 PLY の 3D Gaussian Splatting 向けスタイル。 */
export interface GaussianSplatStyle extends ModelTransformStyle {
	type: 'gaussian-splat';
	opacity: Opacity;
	visible?: boolean;
	/** 元データのスプラット半径に掛ける表示倍率。 */
	splatScale: number;
}

export interface Tiles3DMeshStyle {
	type: '3d-tiles-mesh';
	opacity: Opacity;
	visible?: boolean;
	color: string;
	/** ScenegraphLayer では pbr / flat を切り替える。SimpleMeshLayer では無視される。 */
	lighting: 'pbr' | 'flat';
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
	| 'ifc'
	| 'pmx';

export interface MeshEntry<T> extends BaseModelEntry {
	format: {
		type: MeshFormatType;
		url: string;
		/** アップロード元が GLB のとき、再変換せずに直接ダウンロードするための元ファイル名 */
		sourceFileName?: string;
		mtlUrl?: string;
		resourceUrls?: Record<string, string>;
		normalizeToLocalOrigin?: boolean;
		georeference?: ProjectedModelGeoreference;
		localBounds?: ModelLocalBounds;
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
		/** METER_OFFSETS で描画する場合の地理座標原点 [経度, 緯度, 高さ] */
		coordinateOrigin?: [number, number, number];
		/** 色データ [r,g,b, r,g,b, ...] (0-255) */
		colors?: Uint8Array;
		/** 点数 */
		pointCount: number;
	};
	style: PointCloudStyle;
}

/** Three.js で描画する通常 PLY の 3D Gaussian Splatting entry。 */
export interface GaussianSplatEntry extends BaseModelEntry {
	format: {
		type: 'gaussian-splat';
		url: string;
		sourceFileName?: string;
		encoding: 'ply';
		localBounds?: ModelLocalBounds;
	};
	properties?: ModelEntryProperties & {
		gaussianSplat: {
			splatCount: number;
			shDegree: number;
		};
	};
	style: GaussianSplatStyle;
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

export type AnyMeshEntry = MeshEntry<MeshStyle>;
export type ThreeModelEntry = AnyMeshEntry | GaussianSplatEntry;
export type ThreeModelStyle = MeshStyle | GaussianSplatStyle;

export type AnyTiles3DEntry = Tiles3DEntry<Tiles3DMeshStyle> | Tiles3DEntry<PointCloudStyle>;

export type MeshStyleEntry = MeshEntry<MeshStyle>;
export type Tiles3DMeshStyleEntry = Tiles3DEntry<Tiles3DMeshStyle>;
export type PointCloudStyleEntry = Tiles3DEntry<PointCloudStyle> | PointCloudEntry;

/**
 * morivis の model 系内部モデル。
 * object / runtime を主分類軸とし、three.js 系と deck.gl 系の分岐元になる。
 */
export type MorivisModelEntry =
	| ThreeModelEntry
	| AnyTiles3DEntry
	| PointCloudEntry
	| DeckVectorEntry;
