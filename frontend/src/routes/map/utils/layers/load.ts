import satelliteStyleJson from '$routes/map/utils/layers/satellite_style.json';

import type { LineLayerSpecification, SourceSpecification } from 'maplibre-gl';

/** ラベルのレイヤーを取得 */
export const getLoadLayers = (): LineLayerSpecification[] => {
	return satelliteStyleJson.layers.filter(
		(layer) => layer.type === 'line'
	) as LineLayerSpecification[];
};
