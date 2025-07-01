import satelliteStyleJson from '$routes/utils/layers/satellite_style.json';

import type {
	LineLayerSpecification,
	RasterLayerSpecification,
	RasterSourceSpecification
} from 'maplibre-gl';

export const getBaseMapSources = (): Record<string, RasterSourceSpecification> => {
	return {
		// オブジェクトのプロパティを展開（スプレッド演算子を外側で使用）
		base_seamlessphoto: satelliteStyleJson.sources.base_seamlessphoto,
		base_usgs_imagery_only: satelliteStyleJson.sources.base_usgs_imagery_only
	};
};

export const getBaseMapLayers = (): RasterLayerSpecification[] => {
	return satelliteStyleJson.layers.filter(
		(layer) => layer.type === 'raster'
	) as RasterLayerSpecification[];
};
