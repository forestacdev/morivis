import type {
	FillExtrusionLayerSpecification,
	FillLayerSpecification,
	LineLayerSpecification
} from '$routes/map/utils/maplibre';

import type { PolygonStyle } from '$routes/map/data/types/vector/style';
import type { LayerItem } from '$routes/map/utils/layers';
import {
	createMorivisLayerMetadata,
	createSublayerId,
	getMorivisLogicalLayerId
} from '$routes/map/utils/layers/id';
import {
	getColorExpression,
	getPatternExpression
} from '$routes/map/utils/layers/vector/expression/color';
import { getNumberExpression } from '$routes/map/utils/layers/vector/expression/number';
import { combineFilters } from '$routes/map/utils/layers/vector/filter';

// ポリゴンのパターンレイヤーの作成
export const createFillPatternLayer = (
	layer: LayerItem,
	style: PolygonStyle
): FillLayerSpecification | undefined => {
	const patternExpression = getPatternExpression(style.colors);
	if (!patternExpression) {
		return undefined;
	}
	const defaultStyle = style.default;

	const fillPatternLayer: FillLayerSpecification = {
		...layer,
		id: createSublayerId(layer.id, 'fill_pattern'),
		metadata: createMorivisLayerMetadata(
			getMorivisLogicalLayerId(layer.metadata) ?? layer.id,
			'fill_pattern',
			layer.metadata
		),
		type: 'fill',
		paint: {
			'fill-pattern': patternExpression,
			'fill-opacity': style.opacity
		},
		layout: {},
		...(combineFilters(layer.filter, defaultStyle?.fill?.filter)
			? { filter: combineFilters(layer.filter, defaultStyle?.fill?.filter) }
			: {})
	};

	return fillPatternLayer;
};

// ポリゴンのアウトラインレイヤーの作成
export const createOutLineLayer = (layer: LayerItem, style: PolygonStyle) => {
	const defaultStyle = style.default;
	// TODO ライン幅固定関数
	const _createExponentialLineWidth = (baseWidth: number, baseZoom: number) => {
		return [
			'interpolate',
			['exponential', 2],
			['zoom'],
			0,
			baseWidth * Math.pow(2, 0 - baseZoom),
			24,
			baseWidth * Math.pow(2, 24 - baseZoom)
		];
	};

	const outlineLayer: LineLayerSpecification = {
		...layer,
		id: createSublayerId(layer.id, 'fill_outline'),
		metadata: createMorivisLayerMetadata(
			getMorivisLogicalLayerId(layer.metadata) ?? layer.id,
			'fill_outline',
			layer.metadata
		),
		minzoom: style.outline.minZoom ? style.outline.minZoom : layer.minzoom,
		type: 'line',
		paint: {
			'line-color': style.outline.color,
			'line-width': style.outline.width,
			'line-opacity': style.opacity,
			...(style.outline.lineStyle === 'dashed' && { 'line-dasharray': [2, 2] })
		},
		...(combineFilters(layer.filter, defaultStyle?.line?.filter)
			? { filter: combineFilters(layer.filter, defaultStyle?.line?.filter) }
			: {})
	};
	return outlineLayer;
};

// fillExtrusionレイヤーの作成
export const createFillExtrusionLayer = (
	layer: LayerItem,
	style: PolygonStyle
): FillExtrusionLayerSpecification | undefined => {
	if (!style.extrusion?.show) return undefined;
	const defaultStyle = style.default;
	const colorExpression = getColorExpression(style.colors);
	const height = getNumberExpression(style.extrusion.height);
	const fillExtrusionLayer: FillExtrusionLayerSpecification = {
		...layer,
		type: 'fill-extrusion',
		id: createSublayerId(layer.id, 'fill_extrusion'),
		metadata: createMorivisLayerMetadata(
			getMorivisLogicalLayerId(layer.metadata) ?? layer.id,
			'fill_extrusion',
			layer.metadata
		),
		paint: {
			'fill-extrusion-height': height,
			'fill-extrusion-opacity': style.opacity,
			'fill-extrusion-color': style.colors.show ? colorExpression : '#00000000',
			'fill-extrusion-vertical-gradient': true,
			// 'fill-extrusion-base': 10,

			...(defaultStyle && defaultStyle.fillExtrusion ? defaultStyle.fillExtrusion.paint : {})
		},
		layout: {
			...(defaultStyle && defaultStyle.fillExtrusion ? defaultStyle.fillExtrusion.layout : {})
		},
		...(combineFilters(layer.filter, defaultStyle?.fillExtrusion?.filter)
			? { filter: combineFilters(layer.filter, defaultStyle?.fillExtrusion?.filter) }
			: {})
	};

	return fillExtrusionLayer;
};

export const createFillExtrusionPatternLayer = (
	layer: LayerItem,
	style: PolygonStyle
): FillExtrusionLayerSpecification | undefined => {
	if (!style.extrusion?.show) return undefined;
	const defaultStyle = style.default;
	const patternExpression = getPatternExpression(style.colors);
	if (!patternExpression) {
		return undefined;
	}
	const height = getNumberExpression(style.extrusion.height);
	const fillExtrusionLayer: FillExtrusionLayerSpecification = {
		...layer,
		id: createSublayerId(layer.id, 'fill_extrusion_pattern'),
		metadata: createMorivisLayerMetadata(
			getMorivisLogicalLayerId(layer.metadata) ?? layer.id,
			'fill_extrusion_pattern',
			layer.metadata
		),
		type: 'fill-extrusion',
		paint: {
			'fill-extrusion-height': height,
			'fill-extrusion-opacity': style.opacity,
			'fill-extrusion-pattern': patternExpression,
			...(defaultStyle && defaultStyle.fillExtrusion ? defaultStyle.fillExtrusion.paint : {})
		},
		layout: {
			...(defaultStyle && defaultStyle.fillExtrusion ? defaultStyle.fillExtrusion.layout : {})
		},
		...(combineFilters(layer.filter, defaultStyle?.fillExtrusion?.filter)
			? { filter: combineFilters(layer.filter, defaultStyle?.fillExtrusion?.filter) }
			: {})
	};

	return fillExtrusionLayer;
};

// fillレイヤーの作成
export const createFillLayer = (layer: LayerItem, style: PolygonStyle): FillLayerSpecification => {
	const defaultStyle = style.default;
	const colorExpression = getColorExpression(style.colors);
	const fillLayer: FillLayerSpecification = {
		...layer,
		type: 'fill',
		paint: {
			'fill-opacity': style.opacity,
			'fill-outline-color': '#00000000',
			'fill-color': style.colors.show ? colorExpression : '#00000000',
			...(defaultStyle && defaultStyle.fill ? defaultStyle.fill.paint : {})
		},
		layout: {
			...(defaultStyle && defaultStyle.fill ? defaultStyle.fill.layout : {})
		},
		...(combineFilters(layer.filter, defaultStyle?.fill?.filter)
			? { filter: combineFilters(layer.filter, defaultStyle?.fill?.filter) }
			: {})
	};

	return fillLayer;
};
