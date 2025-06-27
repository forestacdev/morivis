import type { RasterLayerSpecification, RasterSourceSpecification } from 'maplibre-gl';

export const cloudStyleJson = {
	sources: {
		cloud: {
			type: 'raster',
			url: `pmtiles://./cloud.pmtiles`,
			attribution: ''
		} as RasterSourceSpecification
	},
	layers: [
		{
			id: 'cloud_layer',
			source: 'cloud',
			type: 'raster',
			paint: {
				'raster-opacity': [
					'interpolate',
					['linear'],
					['zoom'],
					4,
					1.0, // ズーム0で不透明度1.0（完全不透明）
					5,
					0.1
				]
			}
		} as RasterLayerSpecification
	]
};
