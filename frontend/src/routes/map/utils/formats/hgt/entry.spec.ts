import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseHgt } from '.';
import { createTestHgt } from './__fixtures__/test-hgt';

const mocks = vi.hoisted(() => ({
	encode: vi.fn().mockResolvedValue(undefined),
	mesh: vi.fn().mockImplementation(async () => ({
		format: { url: 'blob:test-mesh' },
		metaData: {}
	})),
	cache: {
		setBbox: vi.fn(),
		setRawBbox: vi.fn(),
		markAs4326: vi.fn(),
		setRawSingleBand: vi.fn(),
		release: vi.fn()
	}
}));
vi.mock('$routes/map/utils/formats/geotiff', () => ({ encodeAllBandsToTerrarium: mocks.encode }));
vi.mock(
	'$routes/map/utils/formats/geotiff/mesh-parallel',
	() => ({ createRasterMeshEntryInWorker: mocks.mesh })
);
vi.mock('$routes/map/utils/cache/raster/geotiff-cache', () => ({ GeoTiffCache: mocks.cache }));
vi.mock(
	'$routes/map/utils/formats/raster/thumbnail',
	() => ({ generateThumbnail: () => 'test-thumbnail' })
);
import { createHgtEntry } from './entry';

beforeEach(() => vi.clearAllMocks());

describe('HGTのentryへの正規化', () => {
	const grid = parseHgt(createTestHgt(), 'N00E000.test-grid.hgt');
	it('標高・欠損と半セル外側のbboxを既存のラスターcacheへ渡す', async () => {
		const entry = await createHgtEntry(
			grid,
			'test-grid',
			'raster',
			new AbortController().signal
		);
		expect(entry).toMatchObject({
			type: 'raster',
			format: { type: 'image' },
			metaData: { name: 'test-grid', attribution: 'SRTM HGT', bounds: grid.bbox },
			style: { type: 'tiff', visualization: { mode: 'single' } }
		});
		expect(mocks.encode).toHaveBeenCalledWith(
			entry.id,
			grid.bands,
			1201,
			1201,
			NaN,
			grid.ranges
		);
		expect(mocks.cache.markAs4326).toHaveBeenCalledWith(entry.id);
		expect(mocks.cache.setBbox).toHaveBeenCalledWith(entry.id, grid.bbox);
		const raw = mocks.cache.setRawSingleBand.mock.calls[0][1];
		expect(raw.band[1]).toBe(-12);
		expect(raw.band[2]).toBeNaN();
	});
	it('メッシュには標本点の範囲を渡す', async () => {
		const entry = await createHgtEntry(grid, 'test-grid', 'mesh', new AbortController().signal);
		expect(mocks.mesh).toHaveBeenCalledWith(expect.objectContaining({
			band: grid.bands[0],
			width: 1201,
			height: 1201,
			bounds: [0, 0, 1, 1],
			nodata: NaN
		}));
		expect(entry.metaData.attribution).toBe('SRTM HGT');
		expect(mocks.encode).not.toHaveBeenCalled();
	});
	it('位置が不明な格子をWGS84として登録しない', () => {
		expect(() =>
			createHgtEntry(
				{ ...grid, sampleBounds: null, transform: null },
				'test-grid',
				'raster',
				new AbortController().signal
			)
		)
			.toThrow('位置合わせ');
		expect(mocks.encode).not.toHaveBeenCalled();
	});
	it('中断された登録ではエンコードを開始しない', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(createHgtEntry(grid, 'test-grid', 'raster', controller.signal)).rejects
			.toMatchObject({ name: 'AbortError' });
		expect(mocks.encode).not.toHaveBeenCalled();
	});
	it('エンコード中のキャンセルでcacheを解放する', async () => {
		const controller = new AbortController();
		mocks.encode.mockImplementationOnce(async () => controller.abort());
		await expect(createHgtEntry(grid, 'test-grid', 'raster', controller.signal)).rejects
			.toMatchObject({ name: 'AbortError' });
		expect(mocks.cache.release).toHaveBeenCalledOnce();
		expect(mocks.cache.markAs4326).not.toHaveBeenCalled();
	});
});
