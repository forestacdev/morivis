import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { readFileSync } from 'node:fs';
import { afterEach, expect, it, vi } from 'vitest';
import { parseAis } from '.';
import { createAisEntry } from './entry';
vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));
afterEach(() => GeojsonCache.clear());
it('受信時刻を既存の時刻軸へ渡し、日時のないログには時刻軸を作らない', async () => {
	const load = (name: string) =>
		parseAis(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8'));
	const result = load('test-vessels.ais');
	const entry = await createAisEntry(result.track_points, 'test-ais');
	expect(entry.type).toBe('vector');
	expect(entry.format.geometryType).toBe('Point');
	expect(entry.properties.temporal?.dimension.values).toEqual([
		'2024-01-02T00:00:00.000Z',
		'2024-01-02T00:01:00.000Z'
	]);
	expect(entry.properties.fields.find(f => f.key === 'speed')?.label).toContain('ノット');
	expect(GeojsonCache.get(entry.id)?.features).toHaveLength(4);
	const track = await createAisEntry(result.tracks, 'test-track');
	expect(track.properties.temporal).toBeUndefined();
	const untimed = await createAisEntry(load('test-untimed.ais').track_points, 'test-untimed');
	expect(untimed.properties.temporal).toBeUndefined();
});
