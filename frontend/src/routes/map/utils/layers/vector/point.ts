import type { CircleLayerSpecification, SymbolLayerSpecification } from 'maplibre-gl';

import type { PointStyle } from '$routes/map/data/types/vector/style';
import type { LayerItem } from '$routes/map/utils/layers';
import { DEFAULT_SYMBOL_TEXT_FONT } from '$routes/constants';
import { compileLabelExpr } from '$routes/map/utils/layers/vector/label';
import type { FieldDef } from '$routes/map/data/types/vector/properties';

import { getColorExpression } from '$routes/map/utils/layers/vector/expression/color';
import { getNumberExpression } from '$routes/map/utils/layers/vector/expression/number';

import type { IconImageSource } from '$routes/map/data/types/vector/properties';
import { getIconExpression } from '$routes/map/utils/layers/vector/expression/color';
import { buildGeneratedPoiIconExpression } from '$routes/map/utils/icon';

import {
	createMorivisLayerMetadata,
	createSublayerId,
	getMorivisLogicalLayerId
} from '$routes/map/utils/layers/id';

// pointレイヤーの作成
export const createCircleLayer = (
	layer: LayerItem,
	style: PointStyle
): CircleLayerSpecification => {
	const outline = style.outline;
	const defaultStyle = style.default;
	const colorExpression = getColorExpression(style.colors);
	const radius = getNumberExpression(style.radius);
	const circleLayer: CircleLayerSpecification = {
		...layer,
		type: 'circle',
		paint: {
			'circle-opacity': style.colors.show ? style.opacity : 0,
			'circle-stroke-opacity': outline.minzoom
				? ['step', ['zoom'], 0, outline.minzoom, style.opacity]
				: style.opacity,
			'circle-color': style.colors.show ? colorExpression : '#00000000',
			'circle-radius': radius,
			'circle-stroke-color': outline.show ? style.outline.color : '#00000000',
			'circle-stroke-width': outline.show ? style.outline.width : 0,
			...(defaultStyle && defaultStyle.circle ? defaultStyle.circle.paint : {})
		},
		layout: {
			...(defaultStyle && defaultStyle.circle ? defaultStyle.circle.layout : {})
		},
		// フィルター設定
		...(() => {
			if (defaultStyle?.circle?.filter) {
				return { filter: defaultStyle.circle.filter };
			}
			return {};
		})()
	};
	return circleLayer;
};

// ポイントのicon用レイヤーの作成
export const createPointIconLayer = (
	layer: LayerItem,
	style: PointStyle
): SymbolLayerSpecification | undefined => {
	const iconExpression = getIconExpression(style.colors);
	if (!iconExpression) {
		return undefined;
	}

	const defaultStyle = style.default;

	const symbolLayer: SymbolLayerSpecification = {
		...layer,

		id: createSublayerId(layer.id, 'point_icon'),
		metadata: createMorivisLayerMetadata(
			getMorivisLogicalLayerId(layer.metadata) ?? layer.id,
			'point_icon',
			layer.metadata
		),
		type: 'symbol',
		paint: {
			'icon-opacity': style.opacity
		},
		layout: {
			'icon-image': iconExpression,
			'icon-size': 1,
			'icon-anchor': 'center',

			// 間引きをオフに
			'icon-allow-overlap': true,
			'icon-ignore-placement': true
		},
		// フィルター設定
		...(() => {
			if (defaultStyle?.symbol?.filter) {
				return { filter: defaultStyle.symbol.filter };
			}
			return {};
		})()
	};

	return symbolLayer;
};

export const createPointImageIconLayer = (
	layer: LayerItem,
	style: PointStyle,
	imageIcon: IconImageSource,
	fields: FieldDef[]
): SymbolLayerSpecification | undefined => {
	const iconExpression = buildGeneratedPoiIconExpression(imageIcon);

	const defaultStyle = style.default;
	const showLabel = style.labels.show;
	const labelKey = style.labels.key;
	const LabelsExpression = style.labels.expressions.find((label) => label.key === labelKey);

	const symbolImageIconLayer: SymbolLayerSpecification = {
		...layer,
		id: layer.id, // NOTE: ハイライト表示のため、元のレイヤーIDを使用
		metadata: createMorivisLayerMetadata(
			getMorivisLogicalLayerId(layer.metadata) ?? layer.id,
			'base',
			layer.metadata
		),
		type: 'symbol',
		paint: {
			'icon-opacity': style.opacity,
			// ラベルのスタイルはアイコンレイヤーに統合
			...(showLabel
				? {
						'text-opacity': 1,
						'text-color': '#000000',
						'text-halo-color': '#e8e8e8',
						'text-halo-width': 2,
						...(defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.paint : {})
					}
				: {})
		},
		layout: {
			'icon-image': iconExpression,
			'icon-size': 0.5,
			'icon-anchor': 'bottom',

			// 間引きをする
			'icon-allow-overlap': false,
			'icon-ignore-placement': false,

			// ラベルのスタイルはアイコンレイヤーに統合
			...(showLabel
				? {
						'text-field': compileLabelExpr(LabelsExpression!, fields),
						'text-size': 12,
						'text-max-width': 12,
						'text-font': DEFAULT_SYMBOL_TEXT_FONT,
						'text-anchor': 'top',
						'text-offset': [0, 0.5],
						...(defaultStyle && defaultStyle.symbol ? defaultStyle.symbol.layout : {})
					}
				: {})
		},
		// フィルター設定
		...(() => {
			if (defaultStyle?.symbol?.filter) {
				return { filter: defaultStyle.symbol.filter };
			}
			return {};
		})()
	};

	return symbolImageIconLayer;
};
