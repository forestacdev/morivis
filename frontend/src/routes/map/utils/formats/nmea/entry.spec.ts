import { formatDate } from '$routes/map/data/types/vector/properties';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { createVectorLayer } from '$routes/map/utils/layers';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseNmea } from '.';
import { createNmeaEntry } from './entry';

vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));
afterEach(() => GeojsonCache.clear());

describe('NMEA entry', () => {
	it.each(['tracks', 'track_points'] as const)(
		'%sをベクター描画と時系列へ接続する',
		async type => {
			const parsed = parseNmea(
				readFileSync(new URL('./__fixtures__/test-track.nmea', import.meta.url), 'utf8')
			);
			const entry = await createNmeaEntry(parsed[type], 'test-track');
			expect(entry.type).toBe('vector');
			expect(
				formatDate(
					parsed[type].features[0].properties.time,
					entry.properties.fields.find(field => field.key === 'time')?.format?.date
				)
			).toBe('2024年1月2日 12:00:00.125 (UTC)');
			expect(entry.properties.temporal?.items?.[0].label).toBe(
				'2024年1月2日 12:00:00.125 (UTC)'
			);
			expect(entry.format.type).toBe('geojson');
			expect(entry.format.geometryType).toBe(type === 'tracks' ? 'LineString' : 'Point');
			expect(GeojsonCache.get(entry.id)?.features).toHaveLength(type === 'tracks' ? 1 : 2);
			expect(entry.properties.temporal?.items).toHaveLength(type === 'tracks' ? 1 : 2);
			const layer = createVectorLayer(
				{ id: entry.id, source: `${entry.id}_source`, minzoom: 0, maxzoom: 24 },
				entry.style,
				entry.properties.fields
			);
			expect(layer?.type).toBe(type === 'tracks' ? 'line' : 'circle');
		}
	);
});
