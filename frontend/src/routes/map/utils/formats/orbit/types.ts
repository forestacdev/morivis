import type { FeatureCollection } from '$routes/map/types/geojson';

export interface OrbitOptions {
	start: string;
	end: string;
	stepSeconds: number;
}
export interface OrbitSatellite {
	id: string;
	name: string;
	epoch: string;
	format: 'TLE' | 'OMM';
}
export interface OrbitSummary {
	satellites: OrbitSatellite[];
	defaultOptions: OrbitOptions;
}
export interface OrbitResult {
	points: FeatureCollection;
	tracks: FeatureCollection;
	timestamps: string[];
	warnings: string[];
}
