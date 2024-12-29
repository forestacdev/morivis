import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';

import type {
	SingleColor,
	MatchColors,
	InterpolateColors,
	SingleNumeric,
	MatchNumeric,
	InterpolateNumeric
} from '$routes/map/data/types';

const createSingleColorExpression = (style: SingleColor): string => {
	return style.default;
};

const createMatchColorsExpression = (
	style: MatchColors,
	property: string
): DataDrivenPropertyValueSpecification<ColorSpecification> => {
	const expression: any[] = ['match', ['get', property]];

	const showCategories = style.showCategories;

	if (showCategories.length === 0) {
		return '#00000000';
	}

	Object.entries(style.categories).forEach(([key, color]) => {
		if (showCategories.includes(key)) {
			// 数値に変換可能なら数値型でプッシュ、そうでなければ文字列型でプッシュ
			const formattedKey = !isNaN(Number(key)) ? Number(key) : key;
			expression.push(formattedKey, color);
		}
	});

	// デフォルトの色を追加
	expression.push(style.default);
	return expression as DataDrivenPropertyValueSpecification<ColorSpecification>;
};

const createInterpolateColorsExpression = (
	style: InterpolateColors,
	property: string
): DataDrivenPropertyValueSpecification<ColorSpecification> => {
	const expression: DataDrivenPropertyValueSpecification<ColorSpecification> = [
		'interpolate',
		['linear'],
		['get', property]
	];

	Object.entries(style.stops).forEach(([key, color]) => {
		// 数値に変換可能なら数値型でプッシュ、そうでなければ文字列型でプッシュ
		const formattedKey = Number(key);
		if (isNaN(Number(key))) {
			throw new Error('Invalid key');
		}
		expression.push(formattedKey, color);
	});

	return expression as DataDrivenPropertyValueSpecification<ColorSpecification>;
};

export const isMatchStyle = (
	style: any
): style is { type: 'match'; property: string; values: MatchColors } => {
	return style.type === 'match';
};

export const isInterpolateStyle = (
	style: any
): style is { type: 'interpolate'; property: string; values: InterpolateColors } => {
	return style.type === 'interpolate';
};

export const isSingleStyle = (
	style: any
): style is { type: 'single'; property: string; values: SingleColor } => {
	return style.type === 'single';
};

// export const isMatchColors = (values: any): values is MatchColors => {
// 	return 'categories' in values;
// };

// export const isInterpolateColors = (values: any): values is InterpolateColors => {
// 	return 'stops' in values;
// };

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
			return createMatchColorsExpression(style.values, style.property);
		case 'interpolate':
			return createInterpolateColorsExpression(style.values, style.property);
		default:
			throw new Error('Unsupported style type');
	}
};

const createSingleNumericExpression = (style: SingleNumeric): number => {
	return style.default;
};

const createMatchNumericExpression = (
	style: MatchNumeric,
	property: string
): DataDrivenPropertyValueSpecification<number> => {
	const expression: any[] = ['match', ['get', property]];

	const showCategories = style.showCategories;

	if (showCategories.length === 0) {
		return style.default;
	}

	Object.entries(style.categories).forEach(([key, value]) => {
		if (showCategories.includes(key)) {
			// 数値に変換可能なら数値型でプッシュ、そうでなければ文字列型でプッシュ
			const formattedKey = !isNaN(Number(key)) ? Number(key) : key;
			expression.push(formattedKey, value);
		}
	});

	// デフォルトの色を追加
	expression.push(style.default);
	return expression as DataDrivenPropertyValueSpecification<number>;
};

const createInterpolateNumericExpression = (
	style: InterpolateNumeric,
	property: string
): DataDrivenPropertyValueSpecification<number> => {
	const expression: DataDrivenPropertyValueSpecification<number> = [
		'interpolate',
		['linear'],
		['get', property]
	];

	Object.entries(style.stops).forEach(([key, value]) => {
		// 数値に変換可能なら数値型でプッシュ、そうでなければ文字列型でプッシュ
		const formattedKey = Number(key);
		if (isNaN(Number(key))) {
			throw new Error('Invalid key');
		}
		expression.push(formattedKey, value);
	});

	return expression as DataDrivenPropertyValueSpecification<number>;
};

export const createNumericExpression = (
	style:
		| { type: 'single'; property: string; values: SingleNumeric }
		| { type: 'match'; property: string; values: MatchNumeric }
		| { type: 'interpolate'; property: string; values: InterpolateNumeric }
): DataDrivenPropertyValueSpecification<number> => {
	switch (style.type) {
		case 'single':
			return createSingleNumericExpression(style.values);
		case 'match':
			return createMatchNumericExpression(style.values, style.property);
		case 'interpolate':
			return createInterpolateNumericExpression(style.values, style.property);
		default:
			throw new Error('Unsupported style type');
	}
};
