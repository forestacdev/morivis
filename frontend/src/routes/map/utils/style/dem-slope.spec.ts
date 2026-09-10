import { describe, expect, it } from 'vitest';

import { createAdjustableRange } from '$routes/map/data/types';
import type { DemSlopeColorStyle } from '$routes/map/data/types/raster';
import { getDemSlopeRangeMode } from './dem-slope';

const defaultStyle: DemSlopeColorStyle = {
	type: 'linear',
	colorMap: 'bone',
	min: 0,
	max: 90
};

describe('傾斜量の配色範囲', () => {
	it('従来の0–90度は自動、独自範囲は手動として扱う', () => {
		expect(getDemSlopeRangeMode(defaultStyle)).toBe('auto');
		expect(getDemSlopeRangeMode({ ...defaultStyle, max: 30 })).toBe('manual');
		expect(getDemSlopeRangeMode({ ...defaultStyle, range: createAdjustableRange(5, 40) }))
			.toBe('manual');
	});

	it('明示的なモード指定は保存された範囲より優先する', () => {
		expect(getDemSlopeRangeMode({ ...defaultStyle, rangeMode: 'manual' })).toBe('manual');
		expect(getDemSlopeRangeMode({ ...defaultStyle, max: 30, rangeMode: 'auto' })).toBe('auto');
	});
});
