import type { RasterLayerSpecification } from 'maplibre-gl';

/**
 * RGB → HSL変換
 */
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
	r /= 255;
	g /= 255;
	b /= 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
				break;
			case g:
				h = ((b - r) / d + 2) / 6;
				break;
			case b:
				h = ((r - g) / d + 4) / 6;
				break;
		}
	}

	return [h * 360, s, l];
};

/**
 * Hex → RGB変換
 */
const hexToRgb = (hex: string): [number, number, number] => {
	const cleanHex = hex.replace(/^#/, '');

	if (cleanHex.length === 3) {
		return [
			parseInt(cleanHex[0] + cleanHex[0], 16),
			parseInt(cleanHex[1] + cleanHex[1], 16),
			parseInt(cleanHex[2] + cleanHex[2], 16)
		];
	}

	if (cleanHex.length === 6) {
		return [
			parseInt(cleanHex.slice(0, 2), 16),
			parseInt(cleanHex.slice(2, 4), 16),
			parseInt(cleanHex.slice(4, 6), 16)
		];
	}

	throw new Error(`Invalid hex color: ${hex}`);
};

/**
 * 目標色に対応するraster-paintを生成
 *
 * @param targetColor - 目標色（例: "#00FF00"）
 * @param baseColor - ライン色（デフォルト: "#FF0000" 赤）
 * @param opacity - 不透明度（0-1）
 * @param options - 追加オプション
 */
export const createRasterPaint = (
	targetColor: string,
	baseColor: string = '#FF0000',
	opacity: number = 1.0,
	options: {
		saturationBoost?: number; // 彩度ブースト（デフォルト: 0）
		brightnessMin?: number; // 最小明度（デフォルト: 0）
		brightnessMax?: number; // 最大明度（デフォルト: 1）
	} = {}
): RasterLayerSpecification['paint'] => {
	// デフォルト値
	const { saturationBoost = 0 } = options;

	// ベース色と目標色のHSL取得
	const baseRgb = hexToRgb(baseColor);
	const targetRgb = hexToRgb(targetColor);

	const [baseHue, baseSat, baseLum] = rgbToHsl(...baseRgb);
	const [targetHue, targetSat, targetLum] = rgbToHsl(...targetRgb);

	// 無彩色の閾値（彩度がこの値以下なら無彩色とみなす）
	const ACHROMATIC_THRESHOLD = 0.05;
	const isTargetAchromatic = targetSat < ACHROMATIC_THRESHOLD;

	// 色相の回転角度を計算（最短経路）
	let hueRotation = targetHue - baseHue;

	// -180 ~ 180の範囲に正規化
	if (hueRotation > 180) {
		hueRotation -= 360;
	} else if (hueRotation < -180) {
		hueRotation += 360;
	}

	// 彩度調整（ベース色と目標色の彩度差 + ブースト）
	let saturationAdjust = targetSat - baseSat + saturationBoost;

	// 明度の調整
	// targetLumとbaseLumの差に基づいて調整
	// raster-brightness-min/maxは0〜1の範囲
	let brightnessMin: number;
	let brightnessMax: number;

	// 無彩色（白・黒・グレー）への変換処理
	if (isTargetAchromatic) {
		// 彩度を完全に落とす
		saturationAdjust = -1;

		// 明度で白黒を表現
		// targetLumが0（黒）～1（白）の範囲
		// brightness-minとmaxを同じ値にすることで、その明度に固定
		brightnessMin = targetLum;
		brightnessMax = targetLum;
	} else {
		// 有彩色の場合、明度差を反映
		// baseLum(赤) ≈ 0.5を基準に、targetLumとの差を調整
		const lumDiff = targetLum - baseLum;

		if (options.brightnessMin !== undefined || options.brightnessMax !== undefined) {
			// オプションで明示的に指定された場合はそれを使用
			brightnessMin = options.brightnessMin ?? 0;
			brightnessMax = options.brightnessMax ?? 1;
		} else {
			// 自動調整: 明度差に応じてmin/maxを調整
			// 明るくする場合: minを上げる、暗くする場合: maxを下げる
			if (lumDiff >= 0) {
				// 明るくする: minを上げて全体を底上げ
				brightnessMin = Math.min(1, lumDiff * 2);
				brightnessMax = 1;
			} else {
				// 暗くする: maxを下げて全体を暗く
				brightnessMin = 0;
				brightnessMax = Math.max(0, 1 + lumDiff * 2);
			}
		}
	}

	return {
		'raster-hue-rotate': isTargetAchromatic ? 0 : hueRotation,
		'raster-saturation': Math.max(-1, Math.min(1, saturationAdjust)),
		'raster-brightness-min': brightnessMin,
		'raster-brightness-max': brightnessMax
	};
};

/**
 * hue-rotateによる明度低下を補正するための係数を計算
 * CSSのhue-rotateはRGB行列変換を使用するため、色相回転時に明度が変化する
 *
 * @param hueRotation - 色相回転角度（-180〜180）
 * @returns 明度補正係数（1.0〜1.3程度）
 */
const getHueRotateBrightnessCompensation = (hueRotation: number): number => {
	// 角度を0-360の範囲に正規化
	const normalizedAngle = ((hueRotation % 360) + 360) % 360;

	// 色相回転による明度低下の補正
	// 経験的な値：
	// - 0°（赤→赤）: 補正不要 (1.0)
	// - 60°（赤→黄）: わずかな補正 (1.05)
	// - 120°（赤→緑）: 最大の補正が必要 (1.25)
	// - 180°（赤→シアン）: 中程度の補正 (1.15)
	// - 240°（赤→青）: 中程度の補正 (1.15)
	// - 300°（赤→マゼンタ）: わずかな補正 (1.05)

	// サイン波を使って滑らかに補間
	// 120°と240°付近で最大の補正（約1.25）
	const radians = (normalizedAngle * Math.PI) / 180;
	const compensation = 1.0 + 0.25 * Math.pow(Math.sin(radians), 2);

	return compensation;
};

/**
 * 目標色に対応するCSSフィルターを生成
 *
 * @param targetColor - 目標色（例: "#00FF00"）
 * @param baseColor - 元の画像の主要色（デフォルト: "#FF0000" 赤）
 * @param opacity - 不透明度（0-1）
 * @param options - 追加オプション
 * @returns CSSフィルター文字列（例: "hue-rotate(120deg) saturate(1.5) brightness(1.2)"）
 */
/**
 * シンプル版: 明度補正を最小限に
 */
export const createCssColorFilter = (
	targetColor: string,
	baseColor: string = '#ff0000',
	opacity: number = 1.0
): string => {
	const baseRgb = hexToRgb(baseColor);
	const targetRgb = hexToRgb(targetColor);

	const [baseHue, baseSat, baseLum] = rgbToHsl(...baseRgb);
	const [targetHue, targetSat, targetLum] = rgbToHsl(...targetRgb);

	// 色相回転
	let hueRotation = targetHue - baseHue;
	if (hueRotation > 180) hueRotation -= 360;
	else if (hueRotation < -180) hueRotation += 360;

	const filters: string[] = [];

	// 無彩色チェック
	if (targetSat < 0.05) {
		filters.push('grayscale(1)');
		filters.push(`brightness(${(targetLum * 2).toFixed(2)})`);
	} else {
		// 色相
		filters.push(`hue-rotate(${hueRotation.toFixed(1)}deg)`);

		// 彩度（相対値）
		const saturate = baseSat > 0 ? targetSat / baseSat : 1;
		filters.push(`saturate(${Math.max(0.5, Math.min(2, saturate)).toFixed(2)})`);

		// 明度（シンプルな計算）
		// baseLum(赤) ≈ 0.5, targetLumとの差を補正
		const brightness = 1 + (targetLum - baseLum) * 1.5;
		filters.push(`brightness(${Math.max(0.5, Math.min(1.8, brightness)).toFixed(2)})`);
	}

	if (opacity < 1) {
		filters.push(`opacity(${opacity.toFixed(2)})`);
	}

	return filters.join(' ');
};
