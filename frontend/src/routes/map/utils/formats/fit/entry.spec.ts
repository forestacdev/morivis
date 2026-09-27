import { formatDate } from '$routes/map/data/types/vector/properties';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { createVectorLayer } from '$routes/map/utils/layers';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseFit } from '.';
import { createFitEntry } from './entry';

vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));
afterEach(() => GeojsonCache.clear());

describe('FIT entry', () => {
	it.each(['tracks', 'track_points'] as const)(
		'%sを通常のベクターレイヤーと時系列属性へ渡す',
		async type => {
			const bytes = readFileSync(new URL('./__fixtures__/test-track.fit', import.meta.url));
			const result = await parseFit(Uint8Array.from(bytes).buffer);
			const entry = await createFitEntry(result[type], 'test-track');
			expect(entry.type).toBe('vector');
			expect(entry.format.type).toBe('geojson');
			expect(entry.format.geometryType).toBe(type === 'tracks' ? 'LineString' : 'Point');
			expect(GeojsonCache.get(entry.id)?.features).toHaveLength(type === 'tracks' ? 2 : 4);
			const time = entry.properties.fields.find(field => field.key === 'time');
			expect(time?.type).toBe('datetime');
			expect(formatDate('2021-09-08T01:46:40Z', time?.format?.date)).toBe(
				'2021年9月8日 01:46:40 (UTC)'
			);
			expect(entry.properties.temporal?.items).toHaveLength(type === 'tracks' ? 2 : 4);
			expect(entry.properties.attributeView.timeKey).toBe('time');
			const layer = createVectorLayer(
				{ id: entry.id, source: `${entry.id}_source`, minzoom: 0, maxzoom: 24 },
				entry.style,
				entry.properties.fields
			);
			expect(layer?.type).toBe(type === 'tracks' ? 'line' : 'circle');
		}
	);
});
