import type { Region } from '$routes/map/data/types/location';
import type { Tag } from '$routes/map/data/types/tags';
import type { AttributionKey } from '$routes/map/data/entries/_meta_data/_attribution';
import type { Opacity } from '$routes/map/data/types';
import type {
	ModelMeshEntry,
	ModelTiles3DEntry,
	MeshStyle,
	PointCloudStyle
} from '$routes/map/data/types/model';
import { IMAGE_TILE_XYZ_SETS } from '$routes/constants';
import { resolveBounds, type Bounds } from '$routes/map/data/entries/_meta_data/_bounds_map';

type XYZPresetKey = keyof typeof IMAGE_TILE_XYZ_SETS;

// ========================================
// 共通設定型
// ========================================
interface BaseModelConfig {
	id: string;
	name: string;
	url: string;
	attribution: AttributionKey;
	location: Region;
	bounds?: Region | Bounds;
	tags?: Tag[];
	downloadUrl?: string;
	sourceDataName?: string;
	xyzImageTile?: XYZPresetKey;
	opacity?: Opacity;
}

// ========================================
// GLTF/GLBメッシュモデル用ファクトリー
// ========================================
export interface MeshModelEntryConfig extends BaseModelConfig {
	transform: {
		lng: number;
		lat: number;
		altitude: number;
		scale?: number;
		rotationY?: number;
	};
	wireframe?: boolean;
	color?: string;
}

export function createMeshModelEntry(config: MeshModelEntryConfig): ModelMeshEntry<MeshStyle> {
	const {
		id,
		name,
		url,
		attribution,
		location,
		bounds = location,
		tags = ['3Dモデル'],
		downloadUrl,
		sourceDataName,
		xyzImageTile = 'zoom_15',
		opacity = 0.7,
		transform,
		wireframe = false,
		color = '#ffffff'
	} = config;

	return {
		id,
		type: 'model',
		format: {
			type: 'gltf',
			url
		},
		metaData: {
			name,
			sourceDataName,
			attribution,
			downloadUrl,
			location,
			tags,
			minZoom: 0,
			maxZoom: 24,
			bounds: resolveBounds(bounds),
			xyzImageTile: IMAGE_TILE_XYZ_SETS[xyzImageTile],
			altitude: transform.altitude
		},
		interaction: { clickable: false },
		style: {
			type: 'mesh',
			opacity,
			wireframe,
			color,
			transform: {
				lng: transform.lng,
				lat: transform.lat,
				altitude: transform.altitude,
				scale: transform.scale ?? 1,
				rotationY: transform.rotationY ?? 0
			}
		}
	};
}

// ========================================
// 3D Tiles ポイントクラウド用ファクトリー
// ========================================
export interface PointCloudEntryConfig extends BaseModelConfig {
	pointSize?: number;
}

export function createPointCloudEntry(
	config: PointCloudEntryConfig
): ModelTiles3DEntry<PointCloudStyle> {
	const {
		id,
		name,
		url,
		attribution,
		location,
		bounds = location,
		tags = ['点群', '3Dモデル'] as Tag[],
		downloadUrl,
		sourceDataName,
		xyzImageTile = 'zoom_15',
		opacity = 0.7,
		pointSize = 0.1
	} = config;

	return {
		id,
		type: 'model',
		format: {
			type: '3d-tiles',
			url
		},
		metaData: {
			name,
			sourceDataName,
			attribution,
			downloadUrl,
			location,
			tags,
			minZoom: 0,
			maxZoom: 24,
			bounds: resolveBounds(bounds),
			xyzImageTile: IMAGE_TILE_XYZ_SETS[xyzImageTile]
		},
		interaction: { clickable: false },
		style: {
			type: 'point-cloud',
			opacity,
			pointSize
		}
	};
}
