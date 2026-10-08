import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { createVectorLayer } from '$routes/map/utils/layers';
import { getTemporalFilter } from '$routes/map/utils/layers/vector/filter';
import type { FilterSpecification } from '$routes/map/utils/maplibre';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCzml } from '.';
import { createCzmlEntry } from './entry';
vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));
afterEach(() => GeojsonCache.clear());
const fixture = (name: string) =>
	readFileSync(new URL(`./__fixtures__/${name}.czml`, import.meta.url), 'utf8');
describe('CZML entry', () => {
	it('ポイントの時刻を既存タイムラインとMapLibreフィルターに接続する', async () => {
		const result = await parseCzml(fixture('test-moving'));
		const entry = await createCzmlEntry(result.points, 'test-moving');
		expect(entry.type).toBe('vector');
		expect(entry.format.geometryType).toBe('Point');
		expect(entry.properties.temporal?.items).toHaveLength(3);
		entry.state = {
			...entry.state,
			temporalFilter: { enabled: true, mode: 'single_start', startIndex: 1, endIndex: 1 }
		};
		expect(getTemporalFilter(entry)).toEqual([
			'==',
			['get', 'time'],
			'2024-01-02T00:00:10.000Z'
		]);
		expect(GeojsonCache.get(entry.id)?.features).toHaveLength(6);
	});
	it.each(['points', 'lines', 'polygons'] as const)(
		'静的%sを通常の描画レイヤーへ渡す',
		async type => {
			const result = await parseCzml(fixture('test-static'));
			const entry = await createCzmlEntry(result[type], 'test-static');
			expect(entry.properties.temporal).toBeUndefined();
			const layer = createVectorLayer(
				{ id: entry.id, source: `${entry.id}_source`, minzoom: 0, maxzoom: 24 },
				entry.style,
				entry.properties.fields
			);
			expect(layer?.type).toBe({ points: 'circle', lines: 'line', polygons: 'fill' }[type]);
		}
	);
});

describe('CZML画像アイコンのスタイル', () => {
	it('時刻フィルターを保ち、元画像を画面正面へ原寸で表示する', async () => {
		const result = await parseCzml(fixture('test-billboards'));
		const entry = await createCzmlEntry(result.billboards, 'test-images', result.timestamps);
		if (entry.style.type !== 'circle') throw new Error('Expected point');
		entry.style.imageIcon = { show: true };
		entry.style.labels.show = false;
		entry.properties.images = {
			icon: {
				type: 'absolute',
				urlKey: 'test-url',
				imageIdKey: 'test-id',
				rendering: 'original',
				embeddedImages: { 'test-image': 'data:image/png;base64,dGVzdA==' }
			}
		};
		const filter: FilterSpecification = ['==', ['get', 'time'], result.timestamps[0]];
		const layer = createVectorLayer(
			{
				id: entry.id,
				source: `${entry.id}_source`,
				minzoom: 0,
				maxzoom: 24,
				filter
			},
			entry.style,
			entry.properties.fields,
			entry.properties.images.icon
		);
		expect(layer?.type).toBe('symbol');
		if (layer?.type !== 'symbol') throw new Error('Expected symbol');
		expect(layer.layout).toMatchObject({
			'icon-size': 1,
			'icon-anchor': 'center',
			'icon-allow-overlap': true,
			'icon-pitch-alignment': 'viewport',
			'icon-rotation-alignment': 'viewport'
		});
		expect(layer.filter).toEqual(filter);
	});
});
