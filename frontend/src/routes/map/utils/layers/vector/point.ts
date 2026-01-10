import type { CircleLayerSpecification } from 'maplibre-gl';

import type { PointStyle } from '$routes/map/data/types/vector/style';
import type { LayerItem } from '$routes/map/utils/layers';

import {
	getColorExpression,
	getSelectedColorExpression
} from '$routes/map/utils/layers/vector/expression/color';
import { getNumberExpression } from '$routes/map/utils/layers/vector/expression/number';

// pointレイヤーの作成
export const createCircleLayer = (
	layer: LayerItem,
	style: PointStyle
): CircleLayerSpecification => {
	const outline = style.outline;
	const defaultStyle = style.default;
	const color = getColorExpression(style.colors);
	const colorExpression = getSelectedColorExpression(color);
	const radius = getNumberExpression(style.radius);
	const circleLayer: CircleLayerSpecification = {
		...layer,
		type: 'circle',
		paint: {
			'circle-opacity': style.colors.show ? style.opacity : 0,
			'circle-stroke-opacity': style.opacity,
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
