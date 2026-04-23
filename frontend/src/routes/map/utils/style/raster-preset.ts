import type { RasterBaseMapStyle } from '$routes/map/data/types/raster';

export type RasterStylePreset =
	| 'default'
	| 'sepia'
	| 'grayscale'
	| 'vintage'
	| 'cool'
	| 'warm'
	| 'vivid'
	| 'soft'
	| 'dramatic'
	| 'night'
	| 'sunset'
	| 'blueprint'
	| 'negative';

export interface RasterStylePresetParameters {
	hueRotate: number;
	brightnessMin: number;
	brightnessMax: number;
	saturation: number;
	contrast: number;
}

/** MapLibreのラスタープロパティをCSSスタイルに変換する */
export const rasterToCSSStyle = (
	rasterStyle: RasterStylePresetParameters
): {
	filter: string;
} => {
	const { hueRotate, brightnessMin, brightnessMax, saturation, contrast } = rasterStyle;

	if (brightnessMin === 1 && brightnessMax === 0) {
		return {
			filter: 'invert(1)'
		};
	}

	const brightness = brightnessMax;
	const cssSaturation = saturation + 1;
	const cssContrast = contrast + 1;

	const filters: string[] = [];

	if (hueRotate !== 0) {
		filters.push(`hue-rotate(${hueRotate}deg)`);
	}

	if (brightness !== 1) {
		filters.push(`brightness(${brightness})`);
	}

	if (cssSaturation !== 1) {
		filters.push(`saturate(${cssSaturation})`);
	}

	if (cssContrast !== 1) {
		filters.push(`contrast(${cssContrast})`);
	}

	return {
		filter: filters.length > 0 ? filters.join(' ') : 'none'
	};
};

/** CSSクラス文字列を生成する */
export const rasterToCSSString = (rasterStyle: RasterBaseMapStyle): string => {
	const cssStyle = rasterToCSSStyle(rasterStyle);

	let cssString = '';

	if (cssStyle.filter && cssStyle.filter !== 'none') {
		cssString += `filter: ${cssStyle.filter};`;
	}

	return cssString;
};

export const RASTER_STYLE_PRESETS: Record<RasterStylePreset, RasterStylePresetParameters> = {
	default: {
		hueRotate: 0,
		brightnessMin: 0,
		brightnessMax: 1,
		saturation: 0,
		contrast: 0
	},
	sepia: {
		hueRotate: 35,
		brightnessMin: 0.1,
		brightnessMax: 0.9,
		saturation: -0.3,
		contrast: 0.2
	},
	grayscale: {
		hueRotate: 0,
		brightnessMin: 0,
		brightnessMax: 1,
		saturation: -1,
		contrast: 0.1
	},
	vintage: {
		hueRotate: 20,
		brightnessMin: 0.2,
		brightnessMax: 0.8,
		saturation: -0.2,
		contrast: 0.3
	},
	cool: {
		hueRotate: 180,
		brightnessMin: 0.1,
		brightnessMax: 1,
		saturation: 0.2,
		contrast: 0.1
	},
	warm: {
		hueRotate: 30,
		brightnessMin: 0.1,
		brightnessMax: 1,
		saturation: 0.3,
		contrast: 0.2
	},
	vivid: {
		hueRotate: 0,
		brightnessMin: 0.1,
		brightnessMax: 1,
		saturation: 0.5,
		contrast: 0.4
	},
	soft: {
		hueRotate: 0,
		brightnessMin: 0.2,
		brightnessMax: 0.9,
		saturation: -0.1,
		contrast: -0.2
	},
	dramatic: {
		hueRotate: 0,
		brightnessMin: 0,
		brightnessMax: 1,
		saturation: 0.2,
		contrast: 0.6
	},
	night: {
		hueRotate: 240,
		brightnessMin: 0,
		brightnessMax: 0.6,
		saturation: -0.3,
		contrast: 0.3
	},
	sunset: {
		hueRotate: 15,
		brightnessMin: 0.3,
		brightnessMax: 0.9,
		saturation: 0.4,
		contrast: 0.2
	},
	blueprint: {
		hueRotate: 200,
		brightnessMin: 0.2,
		brightnessMax: 0.8,
		saturation: 0.3,
		contrast: 0.5
	},
	negative: {
		hueRotate: 0,
		brightnessMin: 1,
		brightnessMax: 0,
		saturation: 0,
		contrast: 0
	}
};

/** プリセット名からラスタースタイルを取得する */
export const getRasterStylePreset = (preset: RasterStylePreset): RasterStylePresetParameters => {
	return RASTER_STYLE_PRESETS[preset];
};

/** プリセット名からCSSスタイルを直接取得する */
export const getPresetCSSStyle = (
	preset: RasterStylePreset
): {
	filter: string;
} => {
	return rasterToCSSStyle(getRasterStylePreset(preset));
};
