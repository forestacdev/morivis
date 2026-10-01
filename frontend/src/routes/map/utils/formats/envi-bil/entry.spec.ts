import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRawRaster, parseRawRasterHeader } from '.';

const mocks = vi.hoisted(() => ({
	encode: vi.fn(),
	raw: vi.fn(),
	release: vi.fn(),
	thumbnail: vi.fn(() => 'test-image'),
	mesh: vi.fn(async () => ({ format: { url: 'blob:test' }, metaData: { attribution: '' } }))
}));
vi.mock('$routes/map/utils/formats/geotiff', () => ({ encodeAllBandsToTerrarium: mocks.encode }));
vi.mock(
	'$routes/map/utils/formats/geotiff/mesh-parallel',
	() => ({ createRasterMeshEntryInWorker: mocks.mesh })
);
vi.mock(
	'$routes/map/utils/formats/raster/thumbnail',
	() => ({ generateThumbnail: mocks.thumbnail })
);
vi.mock(
	'$routes/map/utils/cache/raster/geotiff-cache',
	() => ({
		GeoTiffCache: {
			setBbox: vi.fn(),
			setRawBbox: vi.fn(),
			markAs4326: vi.fn(),
			setRawSingleBand: mocks.raw,
			release: mocks.release
		}
	})
);
import { createRawRasterEntry } from './entry';

const grid = (name: string) =>
	parseRawRaster(
		parseRawRasterHeader(
			readFileSync(new URL(`./__fixtures__/${name}.hdr`, import.meta.url), 'utf8')
		),
		new Uint8Array(readFileSync(new URL(`./__fixtures__/${name}.bil`, import.meta.url))).buffer
	);
beforeEach(() => {
	vi.clearAllMocks();
	mocks.encode.mockResolvedValue(undefined);
});
describe('raw raster entry', () => {
	it('全バンドをキャッシュし、ENVIのdefault bandsでRGB表示する', async () => {
		const source = grid('test-color');
		const entry = await createRawRasterEntry(
			source,
			'test-color',
			'raster',
			new AbortController().signal
		);
		expect(entry).toMatchObject({
			type: 'raster',
			properties: { bands: { numBands: 3 } },
			style: {
				visualization: {
					mode: 'multi',
					uniformsData: {
						multi: {
							r: { index: 2, min: 21, max: 26 },
							g: { index: 1 },
							b: { index: 0 }
						}
					}
				}
			}
		});
		expect(mocks.encode).toHaveBeenCalledWith(entry.id, source.bands, 3, 2, NaN, source.ranges);
		expect(mocks.raw).not.toHaveBeenCalled();
	});
	it('単バンドの値とnodataをDEM用キャッシュへ渡す', async () => {
		const source = grid('test-height');
		const entry = await createRawRasterEntry(
			source,
			'test-height',
			'raster',
			new AbortController().signal
		);
		expect(entry).toMatchObject({ style: { visualization: { mode: 'single' } } });
		expect(mocks.raw).toHaveBeenCalledWith(
			entry.id,
			expect.objectContaining({
				band: new Float32Array([1.5, 2, NaN, 4, 0, -2.5]),
				nodata: NaN
			})
		);
	});
	it('変換中のキャンセルとエラーで途中のキャッシュを解放する', async () => {
		const controller = new AbortController();
		mocks.encode.mockImplementationOnce(async () => controller.abort());
		await expect(createRawRasterEntry(grid('test-color'), 'test', 'raster', controller.signal))
			.rejects.toMatchObject({ name: 'AbortError' });
		expect(mocks.release).toHaveBeenCalledTimes(1);
		mocks.encode.mockRejectedValueOnce(new Error('test-error'));
		await expect(
			createRawRasterEntry(grid('test-color'), 'test', 'raster', new AbortController().signal)
		).rejects.toThrow('test-error');
		expect(mocks.release).toHaveBeenCalledTimes(2);
	});
});
