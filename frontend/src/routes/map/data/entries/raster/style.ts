import type {
	RasterBaseMapStyle,
	RasterCategoricalStyle,
	RasterDemStyle,
	RasterInteraction
} from '$routes/map/data/types/raster';

export const DEFAULT_RASTER_BASEMAP_STYLE: RasterBaseMapStyle = {
	type: 'basemap',
	opacity: 1.0,
	visible: true,
	preset: 'default',
	hueRotate: 0,
	brightnessMin: 0,
	brightnessMax: 1,
	saturation: 0,
	contrast: 0
};

export const DEFAULT_RASTER_CATEGORICAL_STYLE: RasterCategoricalStyle = {
	type: 'categorical',
	opacity: 0.7,
	visible: true,
	legend: {
		type: 'category',
		name: '',
		colors: [''],
		labels: ['']
	}
};

export const DEFAULT_RASTER_DEM_STYLE: RasterDemStyle = {
	type: 'dem',
	opacity: 1.0,
	visualization: {
		demType: 'gsi',
		mode: 'relief',
		uniformsData: {
			relief: {
				max: 4000,
				min: 0,
				colorMap: 'jet'
			},

			slope: {
				max: 90,
				min: 0,
				colorMap: 'salinity'
			},
			aspect: {
				colorMap: 'rainbow-soft'
			}
			// shadow: {
			// 	azimuth: 180,
			// 	altitude: 45
			// },
			// curvature: {
			// 	ridgeThreshold: 0.7,
			// 	valleyThreshold: 0.3,
			// 	ridgeColor: '#980707',
			// 	valleyColor: '#137c83'
			// }
		}
	}
};

export const DEFAULT_RASTER_BASEMAP_INTERACTION: RasterInteraction = {
	clickable: false
};
