import type { PointGeometry } from './geometry';

export interface StreetViewProp {
	node_id: number;
	photo_id: string;
	ID: string;
	name: string;
	Date: string;
}
export interface StreetViewPoint {
	type: 'Feature';
	geometry: PointGeometry;
	properties: StreetViewProp;
}
export interface NextPointData {
	featureData: StreetViewPoint;
	bearing: number;
}

export interface StreetViewPointGeoJson {
	type: 'FeatureCollection';
	features: StreetViewPoint[];
}

interface AngleData {
	angle_x: number;
	angle_y: number;
	angle_z: number;
}

export interface PhotoAngleDict {
	[photo_id: string]: AngleData; // photo_id をキーにする
}

// 現在のポイントデータの型定義
export interface CurrentPointData {
	node_id: number;
	photo_id: string;
	angle: AngleData;
	featureData: NextPointData['featureData'];
	texture: string;
}

// TODO: indexDataの型定義を追加
export interface StreetViewNodeData {
	lng: number;
	lat: number;
	photo_id: string;
	has_link: boolean;
	connection_count: number;
	date: string;
	time: string;
	name: string;
	node_id: number;
}
export type NodeIndex = Record<string, StreetViewNodeData>;
