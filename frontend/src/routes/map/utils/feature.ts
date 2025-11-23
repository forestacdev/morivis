import type { GeoDataEntry } from '$routes/map/data/types';
export type ResultData = ResultPoiData | ResultCoordinateData | ResultAddressData | ResultLayerData;

export type ResultDataType = 'poi' | 'coordinate' | 'address' | 'layer';
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

export interface ResultLayerData {
	type: 'layer';
	name: string;
	layerId: string;
	location: string;
	data: GeoDataEntry;
}
