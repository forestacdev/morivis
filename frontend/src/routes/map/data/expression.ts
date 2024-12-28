import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';

import type { InterpolateColors, MatchColors, SingleColor } from '$routes/map/data/types';

const createSingleColorExpression = (style: SingleColor): string => {
	return style.color;
};

const createMatchExpression = (
	style: MatchColors,
	property: string
): DataDrivenPropertyValueSpecification<ColorSpecification> => {
	const expression: any[] = ['match', ['get', property]];

	Object.entries(style.categories).forEach(([key, color]) => {
		// 数値に変換可能なら数値型でプッシュ、そうでなければ文字列型でプッシュ
		const formattedKey = !isNaN(Number(key)) ? Number(key) : key;
		expression.push(formattedKey, color);
	});

	// デフォルトの色を追加
	expression.push(style.default);
	return expression as DataDrivenPropertyValueSpecification<ColorSpecification>;
};

const createInterpolateExpression = (
	style: InterpolateColors,
	property: string
): DataDrivenPropertyValueSpecification<ColorSpecification> => {
	const expression = ['interpolate', ['linear'], ['get', property]];
	style.stops.forEach(([stop, color]) => {
		expression.push(stop, color);
	});

	console.log(expression);
	return expression as DataDrivenPropertyValueSpecification<ColorSpecification>;
};

export const createColorExpression = (
	style:
		| { type: 'single'; property: string; values: SingleColor }
		| { type: 'match'; property: string; values: MatchColors }
		| { type: 'interpolate'; property: string; values: InterpolateColors }
): DataDrivenPropertyValueSpecification<ColorSpecification> => {
	switch (style.type) {
		case 'single':
			return createSingleColorExpression(style.values);
		case 'match':
			return createMatchExpression(style.values, style.property);
		case 'interpolate':
			return createInterpolateExpression(style.values, style.property);
		default:
			throw new Error('Unsupported style type');
	}
};
