import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
import type {
	VectorLayerType,
	ColorsExpression,
	LabelsExpressions,
	ColorStepExpression
} from '$routes/data/vector/style';

import { scaleLinear } from 'd3-scale';
import { interpolateRgb } from 'd3-interpolate';
import { color } from 'd3-color';

export const generateNumberAndColorMap = (
	mapping: ColorStepExpression['mapping']
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
	const scale = scaleLinear<string>()
		.domain(range) // データの範囲
		.nice() // きれいな値に調整
		.ticks(divisions);

	const minColor = mapping.values[0];
	const maxColor = mapping.values[1];

	// 色スケールの生成
	// const colorScale = scaleSequential(interpolatePRGn).domain([range[0], range[1]]);
	const colorScale = scaleLinear<string>()
		.domain([range[0], range[1]]) // データ範囲
		.interpolate(interpolateRgb) // 色の補間方法
		.range([minColor, maxColor]); // 最小色と最大色

	// 各値に対応する色を生成
	const colors = scale.map((value: number) => {
		const rgbColor = colorScale(value);
		const hexColor = color(rgbColor).formatHex();
		return hexColor;
	});

	return {
		categories: scale,
		values: colors
	};
};

/**
 * カラーパレットを生成する関数
 * @param rows 縦方向の段階数（明度）
 * @param cols 横方向の段階数（色相）
 * @returns 2次元配列としてのカラーパレット
 */
export const generateColorPalette = (rows: number, cols: number): string[][] => {
	// 色相スケール (横方向)
	const hueScale = scaleLinear().domain([0, cols]).range([0, 360]);

	// 明度スケール (縦方向)
	const lightnessScale = scaleLinear().domain([0, rows]).range([90, 30]);

	// 2次元配列のカラーパレットを生成
	const palette: string[][] = [];
	for (let i = 0; i < rows; i++) {
		const row: string[] = [];
		for (let j = 0; j < cols; j++) {
			const hue = hueScale(j) as number; // scaleLinear の戻り値は number | undefined
			const lightness = lightnessScale(i) as number;
			const hexColor = color(`hsl(${hue}, 100%, ${lightness}%)`).formatHex();

			row.push(hexColor);
		}
		palette.push(row);
	}
	return palette;
};

export const commonColors = [
	'#FF0000', // 赤
	'#00FF00', // 緑
	'#0000FF', // 青
	'#FFFF00', // 黄
	'#FF00FF', // マゼンタ
	'#00FFFF', // シアン
	'#FFA500', // オレンジ
	'#800080', // 紫
	'#008000', // 深緑
	'#8B4513' // サドルブラウン
];

/**
 * ランダムな色を取得する関数
 * @returns ランダムな色の16進数表現
 */
export const getRandomCommonColor = (): string => {
	const randomIndex = Math.floor(Math.random() * commonColors.length);
	return commonColors[randomIndex];
};
