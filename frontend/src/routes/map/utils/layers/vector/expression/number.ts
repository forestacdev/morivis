import type { DataDrivenPropertyValueSpecification } from 'maplibre-gl';

import type {
	NumbersStyle,
	NumberLinearExpression,
	NumberMatchExpression,
	NumberStepExpression
} from '$routes/map/data/types/vector/style';

export const getSelectedIconSizeExpression = (
	numbercolorExpression: DataDrivenPropertyValueSpecification<number>
): DataDrivenPropertyValueSpecification<number> => {
	return [
		'case',
		['boolean', ['feature-state', 'selected'], false],
		0.12,
		numbercolorExpression
	] as DataDrivenPropertyValueSpecification<number>;
};

export const generateNumberMatchExpression = (
	expressionData: NumberMatchExpression
): DataDrivenPropertyValueSpecification<number> => {
	const key = expressionData.key;
	const expression: (string | string[] | number)[] = ['match', ['get', key]];

	const { categories, values } = expressionData.mapping;

	if (categories.length !== values.length) {
		console.warn('ステップ式のカテゴリーと値の長さが一致しません。');
		return 0;
	}

	// categories と values のペアをループ処理
	for (let i = 0; i < categories.length; i++) {
		expression.push(categories[i] as number, values[i]);
	}

	// デフォルト値を最後に追加
	expression.push(0);

	return expression as DataDrivenPropertyValueSpecification<number>;
};

export const generateNumberStepExpression = (
	expressionData: NumberStepExpression
): DataDrivenPropertyValueSpecification<number> => {
	const key = expressionData.key;
	const { range, divisions, values } = expressionData.mapping;
	const [min, max] = range;

	// 'coalesce' を使用して数値以外の場合のデフォルト値を設定
	const expression: unknown[] = [
		'step',
		[
			'case',
			['==', ['get', key], null],
			-9999, // 値が null の場合
			['!=', ['to-number', ['get', key], -9999], -9999], // 数値に変換可能な場合
			['to-number', ['get', key], -9999], // 数値を使用
			-9999 // デフォルトは -9999
		] // 数値以外の場合に -9999 を使用
	];

	// データ範囲に応じた適切な桁数を自動決定
	const dataRange = max - min;
	const decimalPlaces = dataRange >= 100 ? 0 : dataRange >= 10 ? 1 : dataRange >= 1 ? 2 : 3;

	// 均等分割してカテゴリを生成
	const categories = Array.from({ length: divisions }, (_, i) => {
		const ratio = i / (divisions - 1);
		const value = min + (max - min) * ratio;
		return Number(value.toFixed(decimalPlaces));
	});

	if (categories.length !== values.length) {
		console.warn('ステップ式のカテゴリーと値の長さが一致しません。');
		return 0;
	}

	// 最初のカテゴリの色を追加（数値が -9999 の場合のデフォルト色）
	expression.push(0);

	// カテゴリと対応する値を追加
	categories.forEach((category, index) => {
		expression.push(category, values[index]);
	});

	return expression as DataDrivenPropertyValueSpecification<number>;
};

export const generateNumberLinearExpression = (
	expr: NumberLinearExpression
): DataDrivenPropertyValueSpecification<number> => {
	const { key, mapping } = expr;
	const [inputMin, inputMax] = mapping.range;
	const [outputMin, outputMax] = mapping.values;

	return ['interpolate', ['linear'], ['get', key], inputMin, outputMin, inputMax, outputMax];
};

export const getNumberExpression = (numbers: NumbersStyle) => {
	const key = numbers.key;
	const expressionData = numbers.expressions.find((expression) => expression.key === key);
	if (!expressionData) {
		console.warn(`数値設定が見つかりません: ${key}`);
		return 0;
	}
	switch (expressionData.type) {
		case 'single':
			return expressionData.mapping.value;
		case 'raw':
			return expressionData.mapping.expression;
		case 'match':
			return generateNumberMatchExpression(expressionData);
		case 'linear':
			return generateNumberLinearExpression(expressionData);
		case 'step':
			return generateNumberStepExpression(expressionData);
		default:
			console.warn(`数値設定が見つかりません: ${key}`);
			return 0;
	}
};

export const getSelectedOpacityExpression = (
	numbercolorExpression: DataDrivenPropertyValueSpecification<number>
): DataDrivenPropertyValueSpecification<number> => {
	return [
		'case',
		['boolean', ['feature-state', 'selected'], false],
		0.8,
		numbercolorExpression
	] as DataDrivenPropertyValueSpecification<number>;
};
