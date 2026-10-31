import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { RasterCategoricalStyle, RasterLegend } from '$routes/map/data/types/raster';
import { getRasterDimensionValue } from './dimension-runtime';

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
