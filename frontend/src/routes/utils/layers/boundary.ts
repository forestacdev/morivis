import satelliteStyleJson from '$routes/utils/layers/satellite_style.json';
import type { LineLayerSpecification, SourceSpecification } from 'maplibre-gl';

/** 行政区域境界のレイヤーを取得 */
export const getBoundaryLayers = (): LineLayerSpecification[] => {
	return satelliteStyleJson.layers as LineLayerSpecification[];
};
