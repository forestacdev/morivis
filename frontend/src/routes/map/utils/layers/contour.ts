import type { SymbolLayerSpecification, LineLayerSpecification } from 'maplibre-gl';
import ContourStyleJson from '$routes/map/data/contour-style.json';

/** ラベルのレイヤーを取得 */
export const getContourLineLayers = (): LineLayerSpecification[] => {
	return ContourStyleJson.layers.filter(
		(layer) => layer.type === 'line'
	) as LineLayerSpecification[];
};

/** ラベルのレイヤーを取得 */
export const getContourLabelLayers = (): SymbolLayerSpecification[] => {
	return ContourStyleJson.layers.filter(
		(layer) => layer.type === 'symbol'
	) as SymbolLayerSpecification[];
};
