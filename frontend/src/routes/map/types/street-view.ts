export interface StreetViewPoint {
	type: 'Feature';
	geometry: {
		type: 'Point';
		coordinates: [number, number];
	};
	properties: {
		node_id: number;
		photo_id: string;
		ID: string;
		name: string;
		Date: string;
	};
}
export interface NextPointData {
	featureData: StreetViewPoint;
	bearing: number;
}

export interface StreetViewPointGeoJson {
	type: 'FeatureCollection';
	features: StreetViewPoint[];
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
