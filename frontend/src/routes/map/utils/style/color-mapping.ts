import type { ColorStepExpression } from '$routes/map/data/types/vector/style';

import {
	getSequentSchemeColors,
	type SequentialScheme
} from '$routes/map/utils/color/color-brewer';
import {
	COLORMAP_PRESETS,
	type ColorMapStop,
	type ColormapPresetName
} from '$routes/map/utils/color/colormap-presets';

type ColorTuple = [number, number, number, number];
type ColorOutputFormat = 'hex' | 'rgb' | 'rgba';

const hexToRgbTuple = (hex: string): [number, number, number] => {
	return [
		parseInt(hex.slice(1, 3), 16),
		parseInt(hex.slice(3, 5), 16),
		parseInt(hex.slice(5, 7), 16)
	];
};

const interpolateChannel = (start: number, end: number, t: number): number => {
	return Math.round(start + (end - start) * t);
};

const resampleHexColors = (colors: readonly string[], shades: number): ColorTuple[] => {
	if (colors.length === 0) {
		throw new Error('colors must not be empty');
	}

	if (colors.length === 1) {
		const [r, g, b] = hexToRgbTuple(colors[0]);
		return Array.from({ length: shades }, () => [r, g, b, 1]);
	}

	return Array.from({ length: shades }, (_, index) => {
		const position = (index / Math.max(shades - 1, 1)) * (colors.length - 1);
		const lowerIndex = Math.floor(position);
		const upperIndex = Math.min(Math.ceil(position), colors.length - 1);
		const t = position - lowerIndex;
		const [r1, g1, b1] = hexToRgbTuple(colors[lowerIndex]);
		const [r2, g2, b2] = hexToRgbTuple(colors[upperIndex]);

		return [
			interpolateChannel(r1, r2, t),
			interpolateChannel(g1, g2, t),
			interpolateChannel(b1, b2, t),
			1
		];
	});
};

const resampleColorStops = (stops: readonly ColorMapStop[], shades: number): ColorTuple[] => {
	if (stops.length === 0) {
		throw new Error('stops must not be empty');
	}

	if (stops.length === 1) {
		const [r, g, b] = hexToRgbTuple(stops[0].color);
		return Array.from({ length: shades }, () => [r, g, b, 1]);
	}

	return Array.from({ length: shades }, (_, index) => {
		const position = index / Math.max(shades - 1, 1);
		let lower = stops[0];
		let upper = stops[stops.length - 1];

		for (let i = 0; i < stops.length - 1; i++) {
			if (position >= stops[i].index && position <= stops[i + 1].index) {
				lower = stops[i];
				upper = stops[i + 1];
				break;
			}
		}

		const span = upper.index - lower.index;
		const t = span === 0 ? 0 : (position - lower.index) / span;
		const [r1, g1, b1] = hexToRgbTuple(lower.color);
		const [r2, g2, b2] = hexToRgbTuple(upper.color);

		return [
			interpolateChannel(r1, r2, t),
			interpolateChannel(g1, g2, t),
			interpolateChannel(b1, b2, t),
			1
		];
	});
};

const formatColorTuple = (color: ColorTuple, format: ColorOutputFormat): string => {
	const [r, g, b, a] = color;
	if (format === 'rgb') return `rgb(${r}, ${g}, ${b})`;
	if (format === 'rgba') return `rgba(${r}, ${g}, ${b}, ${a})`;
	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
		.toString(16)
		.padStart(2, '0')}`;
};

const COLOR_MAP_ALIASES = {} as const satisfies Record<string, SequentialScheme>;

const resolveColorMapName = (
	colorMapName: string
): SequentialScheme | ColormapPresetName | string => {
	return COLOR_MAP_ALIASES[colorMapName as keyof typeof COLOR_MAP_ALIASES] ?? colorMapName;
};

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
export const generateStepGradient = (colors: readonly string[]): string => {
	const step = 100 / colors.length;
	const stops = colors.flatMap((color, i) => {
		const start = step * i;
		const end = step * (i + 1);
		return `${color} ${start}%, ${color} ${end}%`;
	});
	return `linear-gradient(to right, ${stops.join(', ')})`;
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
	private readonly sequentialSchemeNames: Set<string>;
	private readonly colormapPresetNames: Set<string>;
	public constructor() {
		this.cache = new Map();
		this.sequentialSchemeNames = new Set<string>([
			'Blues',
			'Greens',
			'Greys',
			'Oranges',
			'Purples',
			'Reds',
			'BuGn',
			'BuPu',
			'GnBu',
			'OrRd',
			'PuBu',
			'PuBuGn',
			'PuRd',
			'RdPu',
			'YlGn',
			'YlGnBu',
			'YlOrBr',
			'YlOrRd'
		]);
		this.colormapPresetNames = new Set<string>(Object.keys(COLORMAP_PRESETS));
		this.registerCustomColorMap(
			'gsi_relief',
			[0, 300, 1000, 2000, 4000],
			['#46BABA', '#B5A42D', '#B4562D', '#B4491C', '#B43D09']
		);
		this.registerThreeColorGradient(
			'cs',
			'#8383ff', // 谷（負の曲率）: blue
			'#FFFFF0', // 中間: ivory
			'#ff8484' // 尾根（正の曲率）: red
		);
	}

	private resolvePaletteColors(colorMapName: string): readonly string[] | readonly ColorMapStop[] {
		const resolvedName = resolveColorMapName(colorMapName);

		if (this.sequentialSchemeNames.has(resolvedName)) {
			return getSequentSchemeColors(resolvedName as SequentialScheme, 9);
		}

		if (this.colormapPresetNames.has(resolvedName)) {
			return COLORMAP_PRESETS[resolvedName as ColormapPresetName];
		}

		if (this.has(resolvedName)) {
			const pixels = this.get(resolvedName);
			if (!pixels) {
				throw new Error(`Unknown color map: ${colorMapName}`);
			}

			const colors: string[] = [];
			for (let i = 0; i < pixels.length; i += 3) {
				colors.push(
					`#${pixels[i].toString(16).padStart(2, '0')}${pixels[i + 1].toString(16).padStart(2, '0')}${pixels[i + 2].toString(16).padStart(2, '0')}`
				);
			}
			return colors;
		}

		throw new Error(`Unknown color map: ${colorMapName}`);
	}

	public createColorArray(colorMapName: string): Uint8Array {
		const resolvedName = resolveColorMapName(colorMapName);
		const cacheKey = `${resolvedName}`;

		if (this.has(cacheKey)) {
			return this.get(cacheKey) as Uint8Array;
		}

		const width = 256;
		const pixels = new Uint8Array(width * 3); // RGBのみの3チャンネルデータ

		const palette = this.resolvePaletteColors(colorMapName);
		const colors =
			typeof palette[0] === 'string'
				? resampleHexColors(palette as readonly string[], width)
				: resampleColorStops(palette as readonly ColorMapStop[], width);

		// RGBデータの格納
		let ptr = 0;
		for (let i = 0; i < width; i++) {
			const color = colors[i];
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
		const palette = this.resolvePaletteColors(colorMapName);
		const colors = (
			typeof palette[0] === 'string'
				? resampleHexColors(palette as readonly string[], steps)
				: resampleColorStops(palette as readonly ColorMapStop[], steps)
		).map((color) => formatColorTuple(color, 'hex'));

		const gradient = `linear-gradient(${direction}, ${colors.join(', ')})`;
		return gradient;
	}

	/**
	 * カラーマップの最小値の色を取得
	 * @param colorMapName カラーマップ名
	 * @param format 出力フォーマット ('hex' | 'rgb' | 'rgba')
	 * @returns 最小値の色
	 */
	public getMinColor(colorMapName: string, format: ColorOutputFormat = 'hex'): string {
		const palette = this.resolvePaletteColors(colorMapName);
		const colors =
			typeof palette[0] === 'string'
				? resampleHexColors(palette as readonly string[], 16)
				: resampleColorStops(palette as readonly ColorMapStop[], 16);
		return formatColorTuple(colors[0], format); // 最初の色（最小値）
	}

	/**
	 * カラーマップの最大値の色を取得
	 * @param colorMapName カラーマップ名
	 * @param format 出力フォーマット ('hex' | 'rgb' | 'rgba')
	 * @returns 最大値の色
	 */
	public getMaxColor(colorMapName: string, format: ColorOutputFormat = 'hex'): string {
		const palette = this.resolvePaletteColors(colorMapName);
		const colors =
			typeof palette[0] === 'string'
				? resampleHexColors(palette as readonly string[], 16)
				: resampleColorStops(palette as readonly ColorMapStop[], 16);
		return formatColorTuple(colors[colors.length - 1], format); // 最後の色（最大値）
	}

	/**
	 * 数値と色の配列から自作カラーマップを作成しキャッシュに登録する
	 * @param name カラーマップ名
	 * @param values 数値配列（昇順）
	 * @param colors HEXカラー配列（valuesと同じ長さ）
	 * @example
	 * manager.registerCustomColorMap(
	 *   'elevation',
	 *   [0, 300, 1000, 2000, 4000],
	 *   ['#46BABA', '#B5A42D', '#B4562D', '#B4491C', '#B43D09']
	 * );
	 */
	public registerCustomColorMap(name: string, values: number[], colors: string[]): void {
		if (values.length < 2 || values.length !== colors.length) {
			throw new Error('values and colors must have the same length (>= 2)');
		}

		const width = 256;
		const pixels = new Uint8Array(width * 3);

		const minVal = values[0];
		const maxVal = values[values.length - 1];
		const range = maxVal - minVal;

		// HEX→RGB変換
		const rgbStops = values.map((val, i) => {
			const hex = colors[i];
			const r = parseInt(hex.slice(1, 3), 16);
			const g = parseInt(hex.slice(3, 5), 16);
			const b = parseInt(hex.slice(5, 7), 16);
			return { val, r, g, b };
		});

		let ptr = 0;
		for (let i = 0; i < width; i++) {
			// 0-255を元の数値範囲にマッピング
			const value = minVal + (i / (width - 1)) * range;

			// 該当する区間を探す
			let lower = rgbStops[0];
			let upper = rgbStops[rgbStops.length - 1];
			for (let j = 0; j < rgbStops.length - 1; j++) {
				if (value >= rgbStops[j].val && value <= rgbStops[j + 1].val) {
					lower = rgbStops[j];
					upper = rgbStops[j + 1];
					break;
				}
			}

			// 線形補間
			const segRange = upper.val - lower.val;
			const t = segRange === 0 ? 0 : (value - lower.val) / segRange;
			pixels[ptr++] = Math.round(lower.r + (upper.r - lower.r) * t);
			pixels[ptr++] = Math.round(lower.g + (upper.g - lower.g) * t);
			pixels[ptr++] = Math.round(lower.b + (upper.b - lower.b) * t);
		}

		this.cache.set(name, pixels);
	}

	/**
	 * 3色グラデーション（min→mid→max）のカラーマップテクスチャを作成しキャッシュに登録する
	 * シェーダーのcolorRamp3と同じ色分布になる
	 * @param name カラーマップ名
	 * @param minColor HEXカラー（0.0側）
	 * @param midColor HEXカラー（0.5）
	 * @param maxColor HEXカラー（1.0側）
	 */
	public registerThreeColorGradient(
		name: string,
		minColor: string,
		midColor: string,
		maxColor: string
	): void {
		const parseHex = (hex: string) => ({
			r: parseInt(hex.slice(1, 3), 16),
			g: parseInt(hex.slice(3, 5), 16),
			b: parseInt(hex.slice(5, 7), 16)
		});

		const cMin = parseHex(minColor);
		const cMid = parseHex(midColor);
		const cMax = parseHex(maxColor);

		const width = 256;
		const pixels = new Uint8Array(width * 3);

		let ptr = 0;
		for (let i = 0; i < width; i++) {
			const t = i / (width - 1); // 0.0 〜 1.0
			let r: number, g: number, b: number;
			if (t < 0.5) {
				const s = t * 2.0; // 0.0 〜 1.0
				r = cMin.r + (cMid.r - cMin.r) * s;
				g = cMin.g + (cMid.g - cMin.g) * s;
				b = cMin.b + (cMid.b - cMin.b) * s;
			} else {
				const s = (t - 0.5) * 2.0; // 0.0 〜 1.0
				r = cMid.r + (cMax.r - cMid.r) * s;
				g = cMid.g + (cMax.g - cMid.g) * s;
				b = cMid.b + (cMax.b - cMid.b) * s;
			}
			pixels[ptr++] = Math.round(r);
			pixels[ptr++] = Math.round(g);
			pixels[ptr++] = Math.round(b);
		}

		this.cache.set(name, pixels);
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
