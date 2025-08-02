import { ENTRY_PMTILES_RASTER_PATH } from '$routes/constants';
import satelliteStyleJson from '$routes/map/utils/layers/satellite_style.json';

import type {
	LineLayerSpecification,
	RasterLayerSpecification,
	RasterSourceSpecification
} from 'maplibre-gl';

export const getBaseMapSources = (): Record<string, RasterSourceSpecification> => {
	return {
		// オブジェクトのプロパティを展開（スプレッド演算子を外側で使用）
		base_seamlessphoto: satelliteStyleJson.sources.base_seamlessphoto,
		base_usgs_imagery_only: satelliteStyleJson.sources.base_usgs_imagery_only,
		base_gsi_rinya_m: {
			type: 'raster',
			tiles: [
				'https://raw.githubusercontent.com/forestacdev/tiles-ensyurin-photo/main/tiles/{z}/{x}/{y}.webp'
			],
			tileSize: 256,
			maxzoom: 18,
			minzoom: 14,
			attribution: ''
		}
	};
};

export const getBaseMapLayers = (): RasterLayerSpecification[] => {
	return [
		...(satelliteStyleJson.layers.filter(
			(layer) => layer.type === 'raster'
		) as RasterLayerSpecification[]),
		{
			id: 'base_gsi_rinya_m',
			source: 'base_gsi_rinya_m',
			type: 'raster',
			maxzoom: 24,
			minzoom: 12,
			paint: {
				'raster-opacity': 0.9,
				'raster-brightness-min': 0,
				'raster-brightness-max': 0.8
			}
		} as RasterLayerSpecification
	];
};
