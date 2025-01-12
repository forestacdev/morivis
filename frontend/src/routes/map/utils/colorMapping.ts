import chroma from 'chroma-js';
import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
import type {
	VectorLayerType,
	ColorsExpressions,
	LabelsExpressions,
	ColorStepExpressions
} from '$map/data/vector/style';
import colormap from 'colormap';

import { scaleLinear, scaleSequential } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';
import { interpolateOrRd, interpolateBrBG, interpolatePRGn } from 'd3-scale-chromatic';

export const generateNumberAndColorMap = (
	mapping: ColorStepExpressions['mapping']
): {
	categories: number[];
	values: string[];
} => {
	const { range, divisions } = mapping;

	if (divisions <= 0) {
		console.warn('divisions は 0 より大きくなければなりません。');
		throw new Error('divisions must be greater than 0');
	}

	// 数値スケールの生成
	const scale = scaleLinear()
		.domain(range) // データの範囲
		.nice() // きれいな値に調整
		.ticks(divisions);

	const minColor = '#0000FF';
	const maxColor = '#FF0000';

	// 色スケールの生成
	// const colorScale = scaleSequential(interpolatePRGn).domain([range[0], range[1]]);
	const colorScale = scaleLinear<string>()
		.domain([range[0], range[1]]) // データ範囲
		.interpolate(interpolateRgb) // 色の補間方法
		.range([minColor, maxColor]); // 最小色と最大色

	// 各値に対応する色を生成
	const colors = scale.map((value) => colorScale(value));

	return {
		categories: scale,
		values: colors
	};
};

// export const generateGradientColorScale = (
// 	mapping: ColorStepExpressions['mapping']
// ): {
// 	categories: number[];
// 	values: string[];
// } => {
// 	const { range, divisions } = mapping;

// 	if (divisions <= 0) {
// 		console.warn('divisions は 0 より大きくなければなりません。');
// 		throw new Error('divisions must be greater than 0');
// 	}

// 	// 数値スケールの生成
// 	const scale = scaleLinear()
// 		.domain(range) // データの範囲
// 		.nice() // きれいな値に調整
// 		.ticks(divisions);

// 	// 色スケールの生成
// 	const colorScale = scaleSequential(interpolatePRGn).domain([range[0], range[1]]);

// 	// 各値に対応する色を生成
// 	const colors = scale.map((value) => colorScale(value));

// 	return {
// 		categories: scale,
// 		values: colors
// 	};
// };

/**
 * minからmaxまでを指定した分割数で分割し、数値の配列を生成する関数
 *
 * @param min 最小値
 * @param max 最大値
 * @param divisions 分割数
 * @returns 数値の配列
 */
export const generateNumberMap = (mapping: ColorStepExpressions['mapping']): number[] => {
	const { range, divisions } = mapping;

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

	return result;
};
