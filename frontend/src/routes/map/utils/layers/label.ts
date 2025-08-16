import satelliteStyleJson from '$routes/map/utils/layers/satellite_style.json';
import type { SymbolLayerSpecification, LineLayerSpecification } from 'maplibre-gl';

/** 道路のレイヤーを取得 */
export const getRoadLayers = (): LineLayerSpecification[] => {
	return satelliteStyleJson.layers.filter(
		(layer) => layer.type === 'line'
	) as LineLayerSpecification[];
};

/** ラベルのレイヤーを取得 */
export const getLabelLayers = (): SymbolLayerSpecification[] => {
	return satelliteStyleJson.layers.filter(
		(layer) => layer.type === 'symbol'
	) as SymbolLayerSpecification[];
};
