export interface ResultData {
	name: string;
	tile: {
		x: number;
		y: number;
		z: number;
	};
	point: [number, number];
	featureId: number;
	layerId: string;
	location: string;
}
