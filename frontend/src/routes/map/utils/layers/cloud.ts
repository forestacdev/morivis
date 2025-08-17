import { ENTRY_PMTILES_RASTER_PATH } from '$routes/constants';
import type { RasterLayerSpecification, RasterSourceSpecification } from 'maplibre-gl';

export const cloudSources: Record<string, RasterSourceSpecification> = {
	cloud: {
		type: 'raster',
		url: `pmtiles://${ENTRY_PMTILES_RASTER_PATH}/cloud.pmtiles`,
		attribution: ''
	} as RasterSourceSpecification
};

export const cloudLayers: RasterLayerSpecification[] = [
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
				0
			]
		}
	} as RasterLayerSpecification
];
