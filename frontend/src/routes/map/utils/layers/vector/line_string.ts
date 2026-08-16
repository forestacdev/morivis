import type { LineLayerSpecification } from '$routes/map/utils/maplibre';

import type { LineStringStyle } from '$routes/map/data/types/vector/style';
import type { LayerItem } from '$routes/map/utils/layers';
import {
	getColorExpression,
	getPatternExpression
} from '$routes/map/utils/layers/vector/expression/color';
import { getNumberExpression } from '$routes/map/utils/layers/vector/expression/number';

import {
	createMorivisLayerMetadata,
	createSublayerId,
	getMorivisLogicalLayerId
} from '$routes/map/utils/layers/id';
import { combineFilters } from '$routes/map/utils/layers/vector/filter';

// ラインレイヤーの作成
export const createLineLayer = (
	layer: LayerItem,
	style: LineStringStyle
): LineLayerSpecification => {
	const defaultStyle = style.default;
	const colorExpression = getColorExpression(style.colors);
	const width = getNumberExpression(style.width);
	const lineLayer: LineLayerSpecification = {
		...layer,
		type: 'line',
		paint: {
			'line-opacity': style.colors.show ? style.opacity : 0,
			'line-color': style.colors.show ? colorExpression : '#00000000',
			'line-width': width,
			...(style.lineStyle === 'dashed' && { 'line-dasharray': [2, 2] }),
			...(defaultStyle && defaultStyle.line ? defaultStyle.line.paint : {})
		},
		layout: {
			...(defaultStyle && defaultStyle.line ? defaultStyle.line.layout : {})
		},
		...(combineFilters(layer.filter, defaultStyle?.line?.filter)
			? { filter: combineFilters(layer.filter, defaultStyle?.line?.filter) }
			: {})
	};

	// TODO width line-gradient
	return lineLayer;
};

// ラインのパターンレイヤーの作成
export const createLinePatternLayer = (
	layer: LayerItem,
	style: LineStringStyle
): LineLayerSpecification | undefined => {
	const patternExpression = getPatternExpression(style.colors);
	if (!patternExpression) {
		return undefined;
	}
	const defaultStyle = style.default;

	const linePatternLayer: LineLayerSpecification = {
		...layer,
		id: createSublayerId(layer.id, 'line_pattern'),
		metadata: createMorivisLayerMetadata(
			getMorivisLogicalLayerId(layer.metadata) ?? layer.id,
			'line_pattern',
			layer.metadata
		),
		type: 'line',
		paint: {
			'line-pattern': patternExpression,
			'line-opacity': style.opacity,
			'line-width': getNumberExpression(style.width)
		},
		layout: {},
		...(combineFilters(layer.filter, defaultStyle?.line?.filter)
			? { filter: combineFilters(layer.filter, defaultStyle?.line?.filter) }
			: {})
	};

	return linePatternLayer;
};
