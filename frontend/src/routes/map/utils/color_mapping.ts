import type { ColorStepExpression } from '$routes/map/data/types/vector/style';
import colormap from 'colormap';

import { getSequentSchemeColors } from '$routes/map/utils/color/color-brewer';

export const generateNumberAndColorMap = (
	mapping: ColorStepExpression['mapping']
): {
	categories: number[];
	values: readonly string[];
} => {
	const { range, divisions, scheme } = mapping;
	const [min, max] = range;

	// データ範囲に応じた適切な桁数を自動決定
	const dataRange = max - min;
	const decimalPlaces = dataRange >= 100 ? 0 : dataRange >= 10 ? 1 : dataRange >= 1 ? 2 : 3;

	// 均等分割してから桁数調整
	const scale = Array.from({ length: divisions }, (_, i) => {
		const ratio = i / (divisions - 1);
		const value = min + (max - min) * ratio;
		return Number(value.toFixed(decimalPlaces));
	});

	const colors = getSequentSchemeColors(scheme, divisions);

	return {
		categories: scale,
		values: colors
	};
};

/** step用のCSSカラースケール作成 */
export const generateStepGradient = (colors: string[]): string => {
	const step = 100 / colors.length;
	const stops = colors.flatMap((color, i) => {
		const start = step * i;
		const end = step * (i + 1);
		return `${color} ${start}%, ${color} ${end}%`;
	});
	return `linear-gradient(to right, ${stops.join(', ')})`;
};

/** ランダムなHEXカラーを生成する関数 */
const generateRandomHexColors = (count: number): string[] => {
	const colors: string[] = [];

	for (let i = 0; i < count; i++) {
		// 0から255までのランダムな値を3つ生成してRGBにする
		const r = Math.floor(Math.random() * 256);
		const g = Math.floor(Math.random() * 256);
		const b = Math.floor(Math.random() * 256);

		// 各値を16進数に変換して2桁にパディング
		const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
		colors.push(hex);
	}

	return colors;
};

/**  事前定義された色のパレットから選択する関数 */
const generatePresetHexColors = (count: number): string[] => {
	const presetColors = [
		'#FF6B6B',
		'#4ECDC4',
		'#45B7D1',
		'#96CEB4',
		'#FECA57',
		'#FF9FF3',
		'#54A0FF',
		'#5F27CD',
		'#00D2D3',
		'#FF9F43',
		'#10AC84',
		'#EE5A24',
		'#0652DD',
		'#9C88FF',
		'#FFC312',
		'#C4E538',
		'#12CBC4',
		'#FDA7DF',
		'#ED4C67',
		'#F79F1F'
	];

	const colors: string[] = [];

	for (let i = 0; i < count; i++) {
		colors.push(presetColors[i % presetColors.length]);
	}

	return colors;
};

// HSLからRGBへの変換ヘルパー関数
const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
	h = h / 360;
	s = s / 100;
	l = l / 100;

	const hue2rgb = (p: number, q: number, t: number): number => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};

	let r: number, g: number, b: number;

	if (s === 0) {
		r = g = b = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255)
	};
};

/** HSLベースで色相を均等分割して生成する関数 */
export const generateHueBasedHexColors = (count: number): string[] => {
	const colors: string[] = [];

	for (let i = 0; i < count; i++) {
		// 色相を均等分割（0-360度）
		const hue = (360 / count) * i;
		const saturation = 70; // 彩度70%
		const lightness = 50; // 明度50%

		// HSLからRGBに変換
		const rgb = hslToRgb(hue, saturation, lightness);
		const hex = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
		colors.push(hex);
	}

	return colors;
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

	/**
	 * カラーマップの最小値の色を取得
	 * @param colorMapName カラーマップ名
	 * @param format 出力フォーマット ('hex' | 'rgb' | 'rgba')
	 * @returns 最小値の色
	 */
	public getMinColor(colorMapName: string, format: 'hex' | 'rgb' | 'rgba' = 'hex'): string {
		const options = {
			colormap: colorMapName,
			nshades: 16,
			format: format,
			alpha: 1
		};

		const colors = colormap(options as any);
		return colors[0] as string; // 最初の色（最小値）
	}

	/**
	 * カラーマップの最大値の色を取得
	 * @param colorMapName カラーマップ名
	 * @param format 出力フォーマット ('hex' | 'rgb' | 'rgba')
	 * @returns 最大値の色
	 */
	public getMaxColor(colorMapName: string, format: 'hex' | 'rgb' | 'rgba' = 'hex'): string {
		const options = {
			colormap: colorMapName,
			nshades: 16,
			format: format,
			alpha: 1
		};

		const colors = colormap(options as any);
		return colors[colors.length - 1] as string; // 最後の色（最大値）
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
