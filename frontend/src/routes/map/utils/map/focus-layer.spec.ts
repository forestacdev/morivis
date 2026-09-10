import type { MorivisLayerEntry } from '$routes/map/data/types';
import { describe, expect, it } from 'vitest';

import { getSinglePointFocus } from './focus-layer';

const createTestEntry = (
	geometryType: 'Point' | 'LineString',
	bounds: [number, number, number, number]
) => ({
	type: 'vector',
	format: { geometryType },
	metaData: { bounds }
}) as MorivisLayerEntry;

describe('getSinglePointFocus', () => {
	it('一点に縮退したPoint entryへzoom 14の設定を返す', () => {
		const entry = createTestEntry('Point', [10, 20, 10, 20]);

		expect(getSinglePointFocus(entry)).toEqual({ center: [10, 20], zoom: 14 });
	});

	it('複数地点に広がるPoint entryは対象外にする', () => {
		const entry = createTestEntry('Point', [10, 20, 11, 21]);

		expect(getSinglePointFocus(entry)).toBeNull();
	});

	it('一点に縮退したLineString entryは対象外にする', () => {
		const entry = createTestEntry('LineString', [10, 20, 10, 20]);

		expect(getSinglePointFocus(entry)).toBeNull();
	});
});
