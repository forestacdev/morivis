import { getAdjustableRangeValue } from '$routes/map/data/types';
import type { ColorsExpression, ColorsStyle } from '$routes/map/data/types/vector/style';
import { generateNumberAndColorMap } from '$routes/map/utils/style/color-mapping';
import type { ModelAttributes } from '$routes/map/utils/three/model-attributes';

const parseColor = (value: string) => {
	const normalized = value.replace('#', '');
	if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
	return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
};

const interpolateColor = (from: string, to: string, ratio: number) => {
	const start = parseColor(from);
	const end = parseColor(to);
	if (!start || !end) return from;
	const channel = start.map((value, index) =>
		Math.round(value + ((end[index] ?? value) - value) * Math.min(1, Math.max(0, ratio)))
	);
	return `#${channel.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

const evaluateExpression = (expression: ColorsExpression, attributes: ModelAttributes) => {
	const value = attributes[expression.key];
	if (expression.type === 'single') return expression.mapping.value as string;
	if (expression.type === 'match') {
		const index = expression.mapping.categories.findIndex((category) => category === value);
		return index >= 0 ? expression.mapping.values[index] : expression.noData?.value;
	}
	if (typeof value !== 'number') return undefined;
	if (expression.type === 'step') {
		const { categories, values } = generateNumberAndColorMap(expression.mapping);
		let color = values[0];
		categories.forEach((category, index) => {
			if (value >= category) color = values[index] ?? color;
		});
		return color;
	}
	if (expression.type === 'linear') {
		const [min, max] = Array.isArray(expression.mapping.range)
			? expression.mapping.range
			: getAdjustableRangeValue(expression.mapping.range, undefined, undefined);
		return interpolateColor(
			expression.mapping.values[0],
			expression.mapping.values[1],
			(value - min) / (max - min)
		);
	}
};

/** ベクターと共通の ColorsStyle を、モデル部材の属性辞書に対して評価する。 */
export const getModelPartColor = (style: ColorsStyle | undefined, attributes: ModelAttributes) => {
	if (!style?.show) return undefined;
	const expression = style.expressions.find((candidate) => candidate.key === style.key);
	if (!expression || expression.type === 'raw') return undefined;
	return evaluateExpression(expression, attributes);
};
