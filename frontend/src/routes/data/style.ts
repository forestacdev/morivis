export const DEFAULT_RASTER_BASEMAP_STYLE: {
	type: 'basemap';
	opacity: number;
	hueRotate: number;
	brightnessMin: number;
	brightnessMax: number;
	saturation: number;
	contrast: number;
} = {
	type: 'basemap',
	opacity: 1.0,
	hueRotate: 0,
	brightnessMin: 0,
	brightnessMax: 1,
	saturation: 0,
	contrast: 0
};

export const DEFAULT_RASTER_BASEMAP_INTERACTION: {
	clickable: boolean;
} = {
	clickable: false
};
