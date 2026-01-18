import type {
	FillLayerSpecification,
	FillExtrusionLayerSpecification,
	LineLayerSpecification
} from 'maplibre-gl';

import type { PolygonStyle } from '$routes/map/data/types/vector/style';
import type { LayerItem } from '$routes/map/utils/layers';
import {
	getPatternExpression,
	getColorExpression,
	getSelectedColorExpression
} from '$routes/map/utils/layers/vector/expression/color';
import {
	getSelectedOpacityExpression,
	getNumberExpression
} from '$routes/map/utils/layers/vector/expression/number';

// ポリゴンのパターンレイヤーの作成
export const createFillPatternLayer = (
	layer: LayerItem,
	style: PolygonStyle
): FillLayerSpecification | undefined => {
	const patternExpression = getPatternExpression(style.colors);
	if (!patternExpression) {
		return undefined;
	}
	const opacity = getSelectedOpacityExpression(style.opacity);
	const defaultStyle = style.default;

	const fillPatternLayer: FillLayerSpecification = {
		...layer,
		id: `${layer.id}_fill_pattern`,
		type: 'fill',
		paint: {
			'fill-pattern': patternExpression,
			'fill-opacity': opacity
		},
		layout: {},
		// フィルター設定
		...(() => {
			if (defaultStyle?.fill?.filter) {
				return { filter: defaultStyle.fill.filter };
			}
			return {};
		})()
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
		id: `${layer.id}_outline`,
		minzoom: style.outline.minZoom ? style.outline.minZoom : layer.minzoom,
		type: 'line',
		paint: {
			'line-color': style.outline.color,
			'line-width': style.outline.width,
			'line-opacity': style.opacity,
			...(style.outline.lineStyle === 'dashed' && { 'line-dasharray': [2, 2] })
		},
		// フィルター設定
		...(() => {
			if (defaultStyle?.line?.filter) {
				return { filter: defaultStyle.line.filter };
			}
			return {};
		})()
	};
	return outlineLayer;
};

// fillExtrusionレイヤーの作成
export const createFillExtrusionLayer = (
	layer: LayerItem,
	style: PolygonStyle
): FillExtrusionLayerSpecification => {
	const defaultStyle = style.default;
	const color = getColorExpression(style.colors);
	const colorExpression = getSelectedColorExpression(color);
	const height = style.extrusion ? getNumberExpression(style.extrusion.height) : 0;
	const fillExtrusionLayer: FillExtrusionLayerSpecification = {
		...layer,
		type: 'fill-extrusion',
		id: `${layer.id}_fill_extrusion`,
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
		// フィルター設定
		...(() => {
			if (defaultStyle?.fillExtrusion?.filter) {
				return { filter: defaultStyle.fillExtrusion.filter };
			}
			return {};
		})()
	};

	return fillExtrusionLayer;
};

export const createFillExtrusionPatternLayer = (
	layer: LayerItem,
	style: PolygonStyle
): FillExtrusionLayerSpecification => {
	const defaultStyle = style.default;
	const patternExpression = getPatternExpression(style.colors);
	const height = style.extrusion ? getNumberExpression(style.extrusion.height) : 0;
	const fillExtrusionLayer: FillExtrusionLayerSpecification = {
		...layer,
		id: `${layer.id}_fill_extrusion_pattern`,
		type: 'fill-extrusion',
		paint: {
			'fill-extrusion-height': height,
			'fill-extrusion-opacity': style.opacity,
			'fill-extrusion-pattern': patternExpression ? patternExpression : '#00000000',
			...(defaultStyle && defaultStyle.fillExtrusion ? defaultStyle.fillExtrusion.paint : {})
		},
		layout: {
			...(defaultStyle && defaultStyle.fillExtrusion ? defaultStyle.fillExtrusion.layout : {})
		},
		// フィルター設定
		...(() => {
			if (defaultStyle?.fillExtrusion?.filter) {
				return { filter: defaultStyle.fillExtrusion.filter };
			}
			return {};
		})()
	};

	return fillExtrusionLayer;
};

// fillレイヤーの作成
export const createFillLayer = (layer: LayerItem, style: PolygonStyle): FillLayerSpecification => {
	const defaultStyle = style.default;
	const color = getColorExpression(style.colors);
	const colorExpression = getSelectedColorExpression(color);
	const opacity = getSelectedOpacityExpression(style.opacity);
	const fillLayer: FillLayerSpecification = {
		...layer,
		type: 'fill',
		paint: {
			'fill-opacity': opacity,
			'fill-outline-color': '#00000000',
			'fill-color': style.colors.show ? colorExpression : '#00000000',
			...(defaultStyle && defaultStyle.fill ? defaultStyle.fill.paint : {})
		},
		layout: {
			...(defaultStyle && defaultStyle.fill ? defaultStyle.fill.layout : {})
		},
		// フィルター設定
		...(() => {
			if (defaultStyle?.fill?.filter) {
				return { filter: defaultStyle.fill.filter };
			}
			return {};
		})()
	};

	return fillLayer;
};
