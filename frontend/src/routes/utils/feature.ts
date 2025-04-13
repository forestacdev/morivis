export interface ResultData {
	name: string;
	tile: {
		x: number;
		y: number;
		z: number;
	};
	point: [number, number];
	featureId: number;
	propId: string;
	layerId: string;
	location: string;
}
