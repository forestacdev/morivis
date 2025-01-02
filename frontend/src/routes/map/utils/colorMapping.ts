import chroma from 'chroma-js';
import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
import type {
	VectorLayerType,
	ColorsExpressions,
	LabelsExpressions,
	ColorStepExpressions
} from '$map/data/vector/style';

export const generateNumberAndColorMap = (
	mapping: ColorStepExpressions['mapping']
): {
	categories: number[];
	values: string[];
} => {
	const { range, divisions, colorScale } = mapping;

	if (divisions <= 0) {
		console.warn('divisions は 0 より大きくなければなりません。');
		throw new Error('divisions must be greater than 0');
	}

	const [min, max] = range;

	const step = (max - min) / divisions; // 分割ごとの間隔
	const result: number[] = [];

	for (let i = 0; i <= divisions; i++) {
		result.push(min + step * i);
	}
	const colors = chroma.scale(colorScale).colors(divisions + 1);

	return {
		categories: result,
		values: colors
	};
};
