import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import { WEB_MERCATOR_WORLD_BBOX } from '$routes/map/data/entries/_meta_data/_bounds';
import { DEFAULT_MESH_SHADING } from '$routes/map/data/types/model';
import type {
	MeshFormatType,
	MeshStyle,
	GeoArrowEntry,
	GeoJson3DEntry,
	MeshEntry,
	PointCloudEntry,
	Tiles3DEntry,
	PointCloudStyle
} from '$routes/map/data/types/model';
import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { Table } from 'apache-arrow';

import { getRandomColor } from '$routes/map/utils/color/color-brewer';

export const createTiles3DEntry = (
	name: string,
	url: string,
	bounds?: [number, number, number, number]
): Tiles3DEntry<PointCloudStyle> => ({
	id: '3dtiles_' + crypto.randomUUID(),
	type: 'model',
	format: {
		type: '3d-tiles',
		url
	},
	metaData: {
		...DEFAULT_CUSTOM_META_DATA,
		attribution: '3D Tiles',
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
): PointCloudEntry => ({
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
		attribution: '点群',
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

export const createGeoArrowEntry = (
	name: string,
	table: Table,
	geometryType: VectorEntryGeometryType,
	bounds?: [number, number, number, number]
): GeoArrowEntry => ({
	id: 'geoarrow_' + crypto.randomUUID(),
	type: 'model',
	format: {
		type: 'geoarrow',
		table,
		geometryType
	},
	metaData: {
		...DEFAULT_CUSTOM_META_DATA,
		attribution: 'GeoArrow',
		name,
		bounds: bounds ?? WEB_MERCATOR_WORLD_BBOX
	},
	interaction: { clickable: false },
	style: {
		visible: true,
		type: 'geoarrow',
		opacity: 0.7,
		color: getRandomColor()
	}
});

export const createGeoJson3DEntry = (
	name: string,
	data: FeatureCollection,
	geometryType: VectorEntryGeometryType,
	bounds?: [number, number, number, number]
): GeoJson3DEntry => ({
	id: 'geojson3d_' + crypto.randomUUID(),
	type: 'model',
	format: {
		type: 'geojson-3d',
		data,
		geometryType
	},
	metaData: {
		...DEFAULT_CUSTOM_META_DATA,
		attribution: 'GeoJSON 3D',
		name,
		bounds: bounds ?? WEB_MERCATOR_WORLD_BBOX
	},
	interaction: { clickable: false },
	style: {
		visible: true,
		type: 'geoarrow',
		opacity: 0.7,
		color: getRandomColor()
	}
});

export const createGlbEntry = (
	name: string,
	url: string,
	transform: {
		lng: number;
		lat: number;
		altitude: number;
		scale?: number;
		rotationX?: number;
		rotationY?: number;
	},
	formatType: MeshFormatType = 'gltf',
	mtlUrl?: string,
	resourceUrls?: Record<string, string>,
	options?: {
		normalizeToLocalOrigin?: boolean;
	}
): MeshEntry<MeshStyle> => {
	// 3MF は Z-up 前提のモデルが多く、そのままだと map 上で横倒しになるため基準回転を分ける。
	const baseRotationX = formatType === '3mf' ? 90 : -180;

	return {
		id: 'glb_' + crypto.randomUUID(),
		type: 'model',
		format: {
			type: formatType,
			url,
			...(mtlUrl && { mtlUrl }),
			...(resourceUrls && { resourceUrls }),
			...(options?.normalizeToLocalOrigin != null && {
				normalizeToLocalOrigin: options.normalizeToLocalOrigin
			})
		},
		metaData: {
			...DEFAULT_CUSTOM_META_DATA,
			attribution: formatType === 'obj'
				? 'OBJ'
				: formatType === '3ds'
				? '3DS'
				: formatType === 'dae'
				? 'DAE'
				: formatType === '3dm'
				? '3DM'
				: formatType === 'fbx'
				? 'FBX'
				: formatType === 'drc'
				? 'DRC'
				: formatType === '3mf'
				? '3MF'
				: formatType === 'amf'
				? 'AMF'
				: formatType === 'ifc'
				? 'IFC'
				: 'GLB',
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
			shading: { ...DEFAULT_MESH_SHADING },
			transform: {
				lng: transform.lng,
				lat: transform.lat,
				altitude: transform.altitude,
				heightOffset: 0,
				heightScale: 1,
				baseRotationX,
				scale: transform.scale ?? 1,
				rotationX: transform.rotationX ?? 0,
				rotationY: transform.rotationY ?? 0,
				rotationZ: 0
			}
		}
	};
};
