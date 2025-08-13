import type {
	NumberLinearExpression,
	NumberStepExpression
} from '$routes/map/data/types/vector/style';
import { scaleLinear } from 'd3-scale';

export const generateNumberToNumberMap = (
	mapping: NumberStepExpression['mapping']
): {
	categories: number[]; // 境界値（divisions + 1 個）
	values: number[]; // 各カテゴリに対応する値（divisions 個）
} => {
	const { range, divisions, values } = mapping;

	if (import.meta.env.DEV) {
		console.log(range, divisions, values);
	}

	if (divisions <= 0) {
		throw new Error('divisions must be greater than 0');
	}
	// if (values.length !== divisions) {
	// 	throw new Error(`values.length (${values.length}) must match divisions (${divisions})`);
	// }

	const [min, max] = range;
	const step = (max - min) / divisions;

	// 境界値：min から max まで等間隔に (divisions + 1) 個
	const categories = Array.from({ length: divisions }, (_, i) => min + step * i);

	return {
		categories,
		values
	};
};
