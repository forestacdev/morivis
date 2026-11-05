import { createGlbEntry } from '$routes/map/data/entries/model';
import { createRasterEntry } from '$routes/map/data/entries/raster';
import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { temporalData, temporalEntry } from './__fixtures__/temporal';
import { createDimensionController } from './temporal-dimension';

const map = vi.hoisted(() => ({
	getMap: vi.fn(),
	setData: vi.fn(),
	setTiles: vi.fn(),
	setImage: vi.fn(),
	setTemporalModelTimeStep: vi.fn()
}));
const imageSource = vi.hoisted(() => vi.fn());
vi.mock('$routes/stores/map', () => ({ mapStore: map }));
vi.mock('$routes/map/utils/sources/prepare', () => ({ getRasterTiffImageSource: imageSource }));
vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));
const deferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>(done => {
		resolve = done;
	});
	return { promise, resolve };
};
beforeEach(() => {
	vi.clearAllMocks();
	GeojsonCache.clear();
	map.getMap.mockReturnValue({});
});

describe('時刻選択runtime', () => {
	it('遅い旧時刻の応答で最新のsourceとキャッシュを上書きしない', async () => {
		const entry = await temporalEntry();
		const old = deferred<FeatureCollection>();
		const latest = temporalData();
		entry.format.runtimeSource = {
			type: 'geojson',
			resolveData: vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce(latest)
		};
		const controller = createDimensionController(() => entry);
		const pending = controller.select(1);
		await controller.select(2);
		old.resolve({ type: 'FeatureCollection', features: [] });
		await pending;
		expect(map.setData).toHaveBeenCalledExactlyOnceWith('test-temporal_source', latest);
		expect(GeojsonCache.get(entry.id)).toBe(latest);
		expect(entry.state?.dimension?.currentIndex).toBe(2);
	});
	it.each(['dispose', 'entry', 'map'] as const)(
		'%sが変わると通信中の結果を破棄する',
		async reason => {
			let entry = await temporalEntry();
			const old = deferred<FeatureCollection>();
			entry.format.runtimeSource = { type: 'geojson', resolveData: () => old.promise };
			const controller = createDimensionController(() => entry);
			const pending = controller.select(1);
			if (reason === 'dispose') controller.dispose();
			if (reason === 'entry') entry = { ...entry, id: 'test-replacement' };
			if (reason === 'map') map.getMap.mockReturnValue({});
			old.resolve(temporalData());
			await pending;
			expect(map.setData).not.toHaveBeenCalled();
			expect(GeojsonCache.has('test-temporal')).toBe(false);
		}
	);
	it('タイルURLと補助GeoJSONを同じ時刻で更新する', async () => {
		const entry = createRasterEntry(
			'test-raster',
			'https://example.test/{morivis:dimension}/{z}/{x}/{-y}.png',
			{ timeDimension: { values: ['test-0', 'test-1'] } }
		);
		entry.auxiliaryLayers = {
			sources: {
				'test-extra': {
					type: 'geojson',
					data: 'https://example.test/{morivis:dimension}.json'
				}
			},
			layers: []
		};
		await createDimensionController(() => entry).select(1);
		expect(map.setTiles).toHaveBeenCalledWith(`${entry.id}_source`, [
			'https://example.test/test-1/{z}/{x}/{y}.png'
		]);
		expect(map.setData).toHaveBeenCalledWith('test-extra', 'https://example.test/test-1.json');
	});
	it('範囲外・同じ時刻・破棄後の選択は通信しない', async () => {
		const entry = await temporalEntry();
		const resolveData = vi.fn();
		entry.format.runtimeSource = { type: 'geojson', resolveData };
		const controller = createDimensionController(() => entry);
		for (const index of [-1, 3, NaN, 0.5, 0]) await controller.select(index);
		controller.dispose();
		await controller.select(1);
		expect(resolveData).not.toHaveBeenCalled();
		expect(entry.state?.dimension?.currentIndex).toBe(0);
	});
	it('meshの選択はモデルruntimeへ委譲する', async () => {
		const entry = createGlbEntry('test-mesh', 'blob:test-model', {
			lng: 0,
			lat: 0,
			altitude: 0
		});
		entry.properties = {
			...entry.properties,
			temporal: {
				dimension: { type: 'time', values: ['test-0', 'test-1'] }
			}
		};
		await createDimensionController(() => entry).select(1);
		expect(map.setTemporalModelTimeStep).toHaveBeenCalledExactlyOnceWith(entry, 1);
		expect(map.setData).not.toHaveBeenCalled();
	});
});

it('TIFF準備にも失効判定を渡し、最新の画像だけ反映する', async () => {
	const entry = {
		...createRasterEntry('test-tiff', 'blob:test-tiff', {
			timeDimension: { values: ['test-0', 'test-1', 'test-2'] }
		}),
		style: {
			type: 'tiff',
			visualization: {
				mode: 'single',
				uniformsData: { single: { index: 0, min: 0, max: 1, colorMap: 'hsv' } }
			}
		}
	} as RasterImageEntry<RasterTiffStyle>;
	const pending = deferred<{ url: string; coordinates: number[][]; }>();
	const coordinates = [[0, 1], [1, 1], [1, 0], [0, 0]];
	imageSource.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({
		url: 'blob:test-latest',
		coordinates
	});
	const controller = createDimensionController(() => entry);
	const first = controller.select(1);
	const isOldCurrent = imageSource.mock.calls[0][1].isCurrent;
	expect(isOldCurrent()).toBe(true);
	await controller.select(2);
	expect(isOldCurrent()).toBe(false);
	pending.resolve({ url: 'blob:test-old', coordinates });
	await first;
	expect(map.setImage).toHaveBeenCalledExactlyOnceWith(`${entry.id}_source`, {
		url: 'blob:test-latest',
		coordinates
	});
});
