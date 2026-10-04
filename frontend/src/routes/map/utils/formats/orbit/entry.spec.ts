import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { getTemporalFilter } from '$routes/map/utils/layers/vector/filter';
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { inspectOrbit, propagateOrbit } from '.';
import { createOrbitEntry } from './entry';
vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));
afterEach(() => GeojsonCache.clear());

it('地上位置を1時刻表示で登録し、軌跡は全期間のラインとして登録する', async () => {
	const text = readFileSync(new URL('./__fixtures__/test-orbit.tle', import.meta.url), 'utf8');
	const result = propagateOrbit(text, inspectOrbit(text).defaultOptions);
	const point = await createOrbitEntry(result.points, 'test-points');
	expect(point.type).toBe('vector');
	expect(point.format.geometryType).toBe('Point');
	expect(point.properties.temporal?.dimension.values).toHaveLength(121);
	expect(getTemporalFilter(point)).toEqual(['==', ['get', 'time'], result.timestamps[0]]);
	expect(GeojsonCache.get(point.id)?.features).toHaveLength(121);
	expect(point.properties.fields.find(field => field.key === 'height')?.label).toContain('(m)');
	const track = await createOrbitEntry(result.tracks, 'test-tracks');
	expect(track.format.geometryType).toBe('LineString');
	expect(track.properties.temporal).toBeUndefined();
});
