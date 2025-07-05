import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
import type {
	VectorLayerType,
	ColorsExpression,
	LabelsExpressions,
	ColorStepExpression
} from '$routes/map/data/vector/style';
import colormap from 'colormap';

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

// カラーマップデータを作成するクラス
export class ColorMapManager {
	private cache: Map<string, Uint8Array>;
	public constructor() {
		this.cache = new Map();
	}
	public createColorArray(colorMapName: string): Uint8Array {
		const cacheKey = `${colorMapName}`;

		if (this.has(cacheKey)) {
			return this.get(cacheKey) as Uint8Array;
		}

		const width = 256;
		const pixels = new Uint8Array(width * 3); // RGBのみの3チャンネルデータ

		// オプションオブジェクトを作成
		const options = {
			colormap: colorMapName,
			nshades: width,
			format: 'rgb', // RGBAからRGBに変更
			alpha: 1
		};

		let colors = colormap(options as any);

		// RGBデータの格納
		let ptr = 0;
		for (let i = 0; i < width; i++) {
			const color = colors[i] as number[];
			pixels[ptr++] = color[0];
			pixels[ptr++] = color[1];
			pixels[ptr++] = color[2];
		}

		// キャッシュに格納して再利用可能にする
		this.cache.set(cacheKey, pixels);

		return pixels;
	}

	public createSimpleCSSGradient(
		colorMapName: string,
		steps: number = 30,
		direction: string = 'to right'
	): string {
		// オプションオブジェクトを作成
		const options = {
			colormap: colorMapName,
			nshades: steps, // ステップ数を指定
			format: 'hex', // RGBAからRGBに変更
			alpha: 1
		};

		let colors = colormap(options as any);

		const gradient = `linear-gradient(${direction}, ${colors.join(', ')})`;
		return gradient;
	}

	add(cacheKey: string, pixels: Uint8Array): void {
		this.cache.set(cacheKey, pixels);
	}

	get(cacheKey: string): Uint8Array | undefined {
		return this.cache.get(cacheKey);
	}

	has(cacheKey: string): boolean {
		return this.cache.has(cacheKey);
	}
}
