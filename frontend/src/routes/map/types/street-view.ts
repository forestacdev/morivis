export interface StreetViewPoint {
	type: 'Feature';
	geometry: {
		type: 'Point';
		coordinates: [number, number];
	};
	properties: {
		id: number;
		ID: string;
		name: string;
		Name: string;
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
