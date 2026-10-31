import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { RasterCategoricalStyle, RasterLegend } from '$routes/map/data/types/raster';
import { getRasterDimensionValue } from './dimension-runtime';

/** colors は値の小さい順に等間隔で配置する。 */
export const createGradientStops = (colors: string[]): string => {
	if (colors.length <= 1) {
		const color = colors[0] ?? 'transparent';
		return `${color} 0%, ${color} 100%`;
	}
	return colors
		.map((color, index) => `${color} ${((index / (colors.length - 1)) * 100).toFixed(1)}%`)
		.join(', ');
};

export const resolveRasterLegend = (
	style: RasterCategoricalStyle,
	dimensionValue?: string
): RasterLegend => {
	const overrides = style.legendByDimension;
	if (dimensionValue !== undefined && overrides && Object.hasOwn(overrides, dimensionValue)) {
		return overrides[dimensionValue] ?? style.legend;
	}
	return style.legend;
};

export const getRasterLegend = (entry: MorivisLayerEntry): RasterLegend | undefined => {
	if (entry.type !== 'raster' || entry.style.type !== 'categorical') return undefined;
	return resolveRasterLegend(entry.style, getRasterDimensionValue(entry));
};
