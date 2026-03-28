import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import type {
	ModelMeshEntry,
	MeshStyle,
	MeshFormatType,
	ModelTiles3DEntry,
	ModelPointCloudEntry,
	PointCloudStyle
} from '$routes/map/data/types/model';

export const createTiles3DEntry = (
	name: string,
	url: string,
	bounds?: [number, number, number, number]
): ModelTiles3DEntry<PointCloudStyle> => ({
	id: '3dtiles_' + crypto.randomUUID(),
	type: 'model',
	format: {
		type: '3d-tiles',
		url
	},
	metaData: {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		bounds: bounds ?? WEB_MERCATOR_WORLD_BBOX
	},
	interaction: { clickable: false },
	style: {
		visible: true,
		type: 'point-cloud',
		opacity: 0.7,
		pointSize: 1
	}
});

/**
 * 中心座標から小さなbboxを生成する
 * offsetはおおよそ度単位（約100m ≒ 0.001度）
 */
const pointToBbox = (
	lng: number,
	lat: number,
	offset = 0.001
): [number, number, number, number] => [lng - offset, lat - offset, lng + offset, lat + offset];

export const createPointCloudEntry = (
	name: string,
	config: {
		positions: Float32Array;
		colors?: Uint8Array;
		pointCount: number;
	},
	bounds?: [number, number, number, number]
): ModelPointCloudEntry => ({
	id: 'pointcloud_' + crypto.randomUUID(),
	type: 'model',
	format: {
		type: 'point-cloud',
		positions: config.positions,
		colors: config.colors,
		pointCount: config.pointCount
	},
	metaData: {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		bounds: bounds ?? WEB_MERCATOR_WORLD_BBOX
	},
	interaction: { clickable: false },
	style: {
		visible: true,
		type: 'point-cloud',
		opacity: 0.7,
		pointSize: 1
	}
});

export const createGlbEntry = (
	name: string,
	url: string,
	transform: { lng: number; lat: number; altitude: number; scale?: number; rotationY?: number },
	formatType: MeshFormatType = 'gltf',
	mtlUrl?: string
): ModelMeshEntry<MeshStyle> => ({
	id: 'glb_' + crypto.randomUUID(),
	type: 'model',
	format: {
		type: formatType,
		url,
		...(mtlUrl && { mtlUrl })
	},
	metaData: {
		...DEFAULT_CUSTOM_META_DATA,
		name,
		altitude: transform.altitude,
		bounds: pointToBbox(transform.lng, transform.lat)
	},
	interaction: { clickable: false },
	style: {
		visible: true,
		type: 'mesh',
		opacity: 1,
		wireframe: false,
		color: '#ffffff',
		transform: {
			lng: transform.lng,
			lat: transform.lat,
			altitude: transform.altitude,
			scale: transform.scale ?? 1,
			rotationY: transform.rotationY ?? 0
		}
	}
});
