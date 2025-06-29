import satelliteStyleJson from '$routes/utils/layers/satellite_style.json';
import type { SymbolLayerSpecification, SourceSpecification } from 'maplibre-gl';

/** ラベルのレイヤーを取得 */
export const getLabelLayers = (): SymbolLayerSpecification[] => {
	return satelliteStyleJson.layers.filter(
		(layer) => layer.type === 'symbol'
	) as SymbolLayerSpecification[];
};
