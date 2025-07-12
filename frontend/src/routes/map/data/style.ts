import type {
	PolygonStyle,
	LineStringStyle,
	PointStyle,
	LabelStyle,
	Labels
} from '$routes/map/data/types/vector/style';
import type { RasterBaseMapStyle, RasterDemStyle } from '$routes/map/data/types/raster';

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
			shadow: {
				azimuth: 180,
				altitude: 45
			},
			slope: {
				max: 90,
				min: 0,
				colorMap: 'salinity'
			},
			aspect: {
				colorMap: 'rainbow-soft'
			}
			// curvature: {
			// 	ridgeThreshold: 0.7,
			// 	valleyThreshold: 0.3,
			// 	ridgeColor: '#980707',
			// 	valleyColor: '#137c83'
			// }
		}
	}
};

export const DEFAULT_RASTER_BASEMAP_INTERACTION: {
	clickable: boolean;
} = {
	clickable: false
};

export const DEFAULT_VECTOR_POINT_STYLE: PointStyle = {
	type: 'circle',
	opacity: 0.8,
	visible: true,
	markerType: 'circle',
	colors: {
		show: true,
		key: '単色',
		expressions: [
			{
				type: 'single',
				key: '単色',
				name: '単色',
				mapping: {
					value: '#ff00ea'
				}
			}
		]
	},
	radius: {
		key: '単一',
		expressions: [
			{
				type: 'single',
				key: '単一',
				name: '単一',
				mapping: {
					value: 8
				}
			}
		]
	},
	outline: {
		show: true,
		color: '#ffffff',
		width: 2
	},
	labels: {
		key: 'name',
		show: false,
		expressions: [
			{
				key: 'name',
				name: 'name',
				value: '{name}'
			}
		]
	}
};

export const DEFAULT_VECTOR_LINE_STYLE: LineStringStyle = {
	type: 'line',
	opacity: 0.5,
	visible: true,
	colors: {
		show: true,
		key: '単色',
		expressions: [
			{
				type: 'single',
				key: '単色',
				name: '単色',
				mapping: {
					value: '#cf42cc'
				}
			}
		]
	},
	width: {
		key: '単一',
		expressions: [
			{
				type: 'single',
				key: '単一',
				name: '単一',
				mapping: {
					value: 5
				}
			}
		]
	},
	lineStyle: 'solid',
	labels: {
		key: 'name',
		show: false,
		expressions: [
			{
				key: 'name',
				name: 'name',
				value: '{name}'
			}
		]
	}
};

export const DEFAULT_VECTOR_POLYGON_STYLE: PolygonStyle = {
	type: 'fill',
	opacity: 0.5,
	visible: true,
	colors: {
		key: '単色',
		show: true,
		expressions: [
			{
				type: 'single',
				key: '単色',
				name: '単色',
				mapping: {
					value: '#349f1c'
				}
			}
		]
	},
	outline: {
		show: true,
		color: '#000000',
		width: 1,
		lineStyle: 'solid'
	},
	labels: {
		key: 'name',
		show: false,
		expressions: [
			{
				key: 'name',
				name: 'name',
				value: '{name}'
			}
		]
	}
};

export const createLabelsExpressions = (keys: string[]): Labels => {
	const labelsExpressions = keys.map((label) => {
		return {
			key: label,
			name: label,
			value: `{${label}}`
		};
	});

	return {
		key: keys[0],
		show: false,
		expressions: labelsExpressions
	};
};
