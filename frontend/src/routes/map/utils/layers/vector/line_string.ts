import type { LineLayerSpecification } from 'maplibre-gl';

import type { LineStringStyle } from '$routes/map/data/types/vector/style';
import type { LayerItem } from '$routes/map/utils/layers';
import {
	getColorExpression,
	getSelectedColorExpression
} from '$routes/map/utils/layers/vector/expression/color';
import { getNumberExpression } from '$routes/map/utils/layers/vector/expression/number';

// ラインレイヤーの作成
export const createLineLayer = (
	layer: LayerItem,
	style: LineStringStyle
): LineLayerSpecification => {
	const defaultStyle = style.default;
	const color = getColorExpression(style.colors);
	const colorExpression = getSelectedColorExpression(color);
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
		// フィルター設定
		...(() => {
			if (defaultStyle?.line?.filter) {
				return { filter: defaultStyle.line.filter };
			}
			return {};
		})()
	};

	// TODO width line-gradient
	return lineLayer;
};
