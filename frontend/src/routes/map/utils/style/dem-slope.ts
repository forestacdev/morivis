import type { DemSlopeColorStyle } from '$routes/map/data/types/raster';
import { getDemStyleRange } from './color-mapping';

export const getDemSlopeRangeMode = (style: DemSlopeColorStyle): 'auto' | 'manual' => {
	if (style.rangeMode) return style.rangeMode;
	const [min, max] = getDemStyleRange(style);
	return min === 0 && max === 90 ? 'auto' : 'manual';
};
