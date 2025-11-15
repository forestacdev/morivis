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
