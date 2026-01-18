import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';

import type {
	ColorSpecification,
	DataDrivenPropertyValueSpecification,
	ResolvedImageSpecification
} from 'maplibre-gl';

import type {
	ColorsStyle,
	ColorMatchExpression,
	ColorStepExpression
} from '$routes/map/data/types/vector/style';

import { generateNumberAndColorMap } from '$routes/map/utils/color_mapping';

export const generateMatchExpression = (
	expressionData: ColorMatchExpression
): DataDrivenPropertyValueSpecification<ColorSpecification> => {
	const key = expressionData.key;
	const expression = ['match', ['get', key]];

	const { categories, values } = expressionData.mapping;

	if (categories.length !== values.length) {
		console.warn('ステップ式のカテゴリーと値の長さが一致しません。');
		return '#ff0000';
	}

	// categories と values のペアをループ処理
	for (let i = 0; i < categories.length; i++) {
		expression.push(categories[i] as string, values[i]);
	}

	// デフォルト値を最後に追加
	if (expressionData.noData) {
		expression.push(expressionData.noData.value);
	} else {
		expression.push('transparent');
	}

	return expression as DataDrivenPropertyValueSpecification<ColorSpecification>;
};

export const generateStepExpression = (
	expressionData: ColorStepExpression
): DataDrivenPropertyValueSpecification<ColorSpecification> => {
	const key = expressionData.key;

	const { categories, values } = generateNumberAndColorMap(expressionData.mapping);

	if (categories.length !== values.length) {
		console.warn('ステップ式のカテゴリーと値の長さが一致しません。');
		return '#ff0000';
	}

	// 数値変換した値
	const numericValue = ['to-number', ['get', key]];

	// step式の部分を構築
	const stepExpression: any[] = ['step', numericValue];

	// 最初の色（最小値未満）
	stepExpression.push(values[0]);

	// 2番目以降
	for (let i = 1; i < categories.length; i++) {
		stepExpression.push(categories[i], values[i]);
	}

	// プロパティの存在と型をチェック
	const expression = [
		'case',
		['!', ['has', key]], // プロパティが存在しない
		'#00000000',
		['==', ['get', key], null], // nullの場合
		'#00000000',
		['==', ['typeof', numericValue], 'number'], // to-numberの結果が数値か
		stepExpression,
		'#00000000' // その他は透明
	];

	return expression as DataDrivenPropertyValueSpecification<ColorSpecification>;
};

export const getColorExpression = (colors: ColorsStyle) => {
	const key = colors.key;
	const expressionData = colors.expressions.find((expression) => expression.key === key);
	if (!expressionData) {
		console.warn(`カラー設定が見つかりません: ${key}`);
		return '#ff0000';
	}
	switch (expressionData.type) {
		case 'single':
			return expressionData.mapping.value;
		case 'raw':
			return expressionData.mapping.expression;
		case 'match':
			return generateMatchExpression(expressionData);
		case 'step':
			return generateStepExpression(expressionData);
		default:
			console.warn(`カラー設定が見つかりません: ${key}`);
			return '#ff0000';
	}
};

export const getPatternMatchExpression = (
	expressionData: ColorMatchExpression
): DataDrivenPropertyValueSpecification<ResolvedImageSpecification> | null => {
	const key = expressionData.key;

	const { categories, patterns } = expressionData.mapping;
	if (!patterns) return null;

	const patternFilter = patterns.filter((item) => item !== null);

	if (!patternFilter.length) {
		return null;
	}

	const expression: (string | string[] | null)[] = ['match', ['get', key]];

	for (let i = 0; i < categories.length; i++) {
		if (patterns[i] !== null) expression.push(categories[i] as string, patterns[i]);
	}

	expression.push(''); // デフォルト値

	return expression as DataDrivenPropertyValueSpecification<ColorSpecification>;
};

export const getPatternExpression = (colors: ColorsStyle) => {
	const key = colors.key;
	const expressionData = colors.expressions.find((expression) => expression.key === key);
	if (!expressionData) {
		return null;
	}

	switch (expressionData.type) {
		case 'single':
			return expressionData.mapping.pattern;
		case 'raw':
			return expressionData.mapping.expression;
		case 'match':
			return getPatternMatchExpression(expressionData);
		default:
			return null;
	}
};

export const getSelectedColorExpression = (
	colorExpression: DataDrivenPropertyValueSpecification<ColorSpecification>
): DataDrivenPropertyValueSpecification<ColorSpecification> => {
	return [
		'case',
		['boolean', ['feature-state', 'selected'], false],
		HIGHLIGHT_LAYER_COLOR,
		colorExpression
	] as DataDrivenPropertyValueSpecification<ColorSpecification>;
};
