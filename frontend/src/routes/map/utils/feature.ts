import type { GeoDataEntry } from '$routes/map/data/types';
import type { FeatureCollection, Point, Feature } from 'geojson';
export type ResultData = ResultPoiData | ResultCoordinateData | ResultAddressData | ResultLayerData;

export type ResultDataType = 'poi' | 'coordinate' | 'address' | 'layer';
export interface ResultPoiData {
	id?: number;
	type: 'poi';
	name: string;
	point: [number, number];
	featureId: number;
	propId: string;
	layerId: string;
	location: string;
}

export interface ResultAddressData {
	id?: number;
	type: 'address';
	point: [number, number];
	name: string;
	location: string;
}

export interface ResultCoordinateData {
	id?: number;
	type: 'coordinate';
	name: string;
	point: [number, number];
}

export interface ResultLayerData {
	id?: number;
	type: 'layer';
	name: string;
	layerId: string;
	location: string;
	data: GeoDataEntry;
}

export type SearchGeojsonData = {
	type: 'FeatureCollection';
	features: {
		id: number | undefined;
		type: 'Feature';
		geometry: {
			type: 'Point';
			coordinates: [number, number];
		};
		properties: ResultData;
	}[];
};
