import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { createLayersItems } from '$routes/map/utils/layers';
import { getMorivisLogicalLayerId } from '$routes/map/utils/layers/id';
import distance from '@turf/distance';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTyphoonEntry, fetchTyphoonData, loadTyphoonEntry, parseTyphoonTargets } from '.';
import { convertTyphoonForecast } from './convert';
const fixture = (): Record<string, unknown>[] =>
	JSON.parse(readFileSync(new URL('./__fixtures__/test-forecast.json', import.meta.url), 'utf8'));
afterEach(() => {
	vi.unstubAllGlobals();
	GeojsonCache.clear();
});

describe('気象庁の台風エントリー', () => {
	it('緯度経度順を変換し、実況・予報時刻と経路を分ける', () => {
		const result = convertTyphoonForecast(fixture(), 'TC0001');
		expect(result.centers.features).toHaveLength(3);
		expect(result.centers.features[0]).toMatchObject({
			geometry: { coordinates: [2, 1] },
			properties: {
				name: 'TEST-TYPHOON',
				kind: '実況',
				issue_time: '2024-01-02T00:00:00.000Z',
				valid_time: '2024-01-01T23:00:00.000Z'
			}
		});
		expect(result.tracks.features.map(f => f.properties.kind)).toEqual([
			'発達前の経路',
			'実況経路',
			'予報中心線',
			'予報中心線'
		]);
		expect(result.circles.features).toHaveLength(4);
	});
	it('予報円のメートル単位を保ち、輪郭と接線を作る', () => {
		const circle = convertTyphoonForecast(fixture(), 'TC0001').circles.features[0];
		expect(circle.properties).toMatchObject({ radius_km: 10, probability: 70 });
		if (circle.geometry.type !== 'LineString') throw new Error('Expected circle outline');
		expect(circle.geometry.coordinates[0]).toEqual(circle.geometry.coordinates.at(-1));
		for (const xy of circle.geometry.coordinates) {
			expect(distance([3, 2], xy, { units: 'meters' })).toBeCloseTo(10000, 0);
		}
	});
	it('異なる台風を結ばず、日付変更線でも線を分割する', () => {
		const rows = fixture();
		rows[1].track = { typhoon: [[1, 179], [1, -179], [1, -178]] };
		const result = convertTyphoonForecast(rows, 'TC0001');
		const history = result.tracks.features.filter(f => f.properties.kind === '実況経路');
		expect(history.map(f => f.geometry)).toMatchObject([
			{ coordinates: [[179, 1], [180, 1]] },
			{ coordinates: [[-180, 1], [-179, 1], [-178, 1]] }
		]);
	});
	it('空一覧は正常とし、不正なIDやデータ構造は拒否する', () => {
		expect(parseTyphoonTargets([])).toEqual([]);
		expect(parseTyphoonTargets([{ tropicalCyclone: 'TC0001' }, { tropicalCyclone: 'TC0001' }]))
			.toEqual(['TC0001']);
		expect(() => parseTyphoonTargets([{ tropicalCyclone: '../test' }])).toThrow('識別番号');
		expect(() => parseTyphoonTargets({})).toThrow('形式');
		expect(() => convertTyphoonForecast([], 'TC0001')).toThrow('日時');
		const bad = fixture();
		bad[1].center = [100, 2];
		expect(() => convertTyphoonForecast(bad, 'TC0001')).toThrow('座標');
	});
	it('一覧から全対象を取得し、HTTP失敗を空データへ置き換えない', async () => {
		const fetcher = vi.fn(async (url: string) =>
			new Response(
				JSON.stringify(
					url.endsWith('targetTc.json')
						? [{ tropicalCyclone: 'TC0001' }, { tropicalCyclone: 'TC0002' }]
						: fixture()
				)
			)
		);
		vi.stubGlobal('fetch', fetcher);
		const data = await fetchTyphoonData();
		expect(fetcher).toHaveBeenCalledTimes(3);
		expect(data.centers.features).toHaveLength(6);
		expect(new Set(data.centers.features.map(f => f.properties.cyclone)).size).toBe(2);
		fetcher.mockImplementation(async (url: string) => {
			if (url.includes('TC0002/')) return new Response('test-error', { status: 503 });
			return new Response(JSON.stringify(
				url.endsWith('targetTc.json')
					? [{ tropicalCyclone: 'TC0001' }, { tropicalCyclone: 'TC0002' }]
					: fixture()
			));
		});
		await expect(fetchTyphoonData()).rejects.toThrow('503');
		fetcher.mockImplementation(async () => new Response('test-error', { status: 503 }));
		await expect(fetchTyphoonData()).rejects.toThrow('503');
	});
	it('進路と予報円を1つのラインエントリーにまとめ、中心位置を補助表示にする', async () => {
		const fetcher = vi.fn(async (url: string) =>
			new Response(
				JSON.stringify(
					url.endsWith('targetTc.json') ? [{ tropicalCyclone: 'TC0001' }] : fixture()
				)
			)
		);
		vi.stubGlobal('fetch', fetcher);
		const [entry] = await Promise.all([loadTyphoonEntry(), loadTyphoonEntry()]);
		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(entry.format.geometryType).toBe('LineString');
		const geojson = GeojsonCache.get(entry.id)!;
		expect(geojson.features).toHaveLength(8);
		expect(geojson.features.every(f => f.geometry.type === 'LineString')).toBe(true);
		expect(geojson.features.some(f => f.properties.kind === '予報円')).toBe(true);
		expect(entry.auxiliaryLayers?.sources?.[`${entry.id}_centers_source`]).toMatchObject({
			type: 'geojson',
			data: { features: convertTyphoonForecast(fixture(), 'TC0001').centers.features }
		});
		expect(createTyphoonEntry().id).toBe(entry.id);
	});
	it('親の表示・不透明度を中心位置とラベルに反映し、クリック先を親に結び付ける', () => {
		const entry = createTyphoonEntry(convertTyphoonForecast(fixture(), 'TC0001'));
		entry.style.opacity = 0.5;
		const generate = () =>
			createLayersItems({
				entries: [entry],
				mode: 'main',
				baseMap: null,
				showHillshade: false,
				showStreetView: false
			});
		const result = generate();
		expect(result.layers.map(layer => layer.type)).toEqual(['line', 'circle', 'symbol']);
		expect(result.layers[0]).toMatchObject({ paint: { 'line-opacity': 0.5 } });
		expect(result.layers[1]).toMatchObject({ paint: { 'circle-opacity': 0.5 } });
		expect(result.layers[2]).toMatchObject({ paint: { 'text-opacity': 0.5 } });
		expect(result.clickableVectorIds).toContain(`${entry.id}_centers`);
		expect(getMorivisLogicalLayerId(result.layers[1].metadata)).toBe(entry.id);
		entry.style.visible = false;
		expect(generate().layers).toEqual([]);
		expect(generate().clickableVectorIds).toEqual([]);
	});

	it('発表中の台風がない場合は空の地物を返す', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('[]')));
		const data = await fetchTyphoonData();
		expect(data.centers.features).toEqual([]);
		expect(data.circles.features).toEqual([]);
	});
});
