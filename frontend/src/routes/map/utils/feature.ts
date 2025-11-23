import center from '@turf/center';

export type ResultData = ResultPoiData | ResultCoordinateData | ResultAddressData;

export type ResultDataType = 'poi' | 'coordinate' | 'address';
export interface ResultPoiData {
	type: 'poi';
	name: string;
	point: [number, number];
	featureId: number;
	propId: string;
	layerId: string;
	location: string;
}

export interface ResultAddressData {
	type: 'address';
	point: [number, number];
	name: string;
	location: string;
}

export interface ResultCoordinateData {
	type: 'coordinate';
	name: string;
	point: [number, number];
}
