import { createTestRegionalZarr } from '$routes/map/utils/formats/geozarr/__fixtures__/test-regions';
import { createTestZarrStore } from '$routes/map/utils/formats/geozarr/__fixtures__/test-store';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gridPixel, tileLatitude } from './grid';
import {
	configureGeoZarrRuntime,
	geozarrProtocol,
	inspectGeoZarr,
	listGeoZarrArrayCandidates,
	mountLocalGeoZarr,
	registerGeoZarr,
	releaseLocalGeoZarr,
	unregisterGeoZarr
} from './runtime';

vi.mock(
	'$routes/map/protocol/farbling',
	() => ({ convertCanvasToResult: async () => new Blob(['test-png']) })
);

let lastPixels: Uint8ClampedArray = new Uint8ClampedArray();
let sequence = 0;
const setupStore = (version: 2 | 3, transpose = false, rootArray = false) => {
	const files = createTestZarrStore(version, transpose, rootArray);
	const base = `https://test-zarr.invalid/test-${++sequence}.zarr`;
	configureGeoZarrRuntime('https://test-zarr.invalid');
	vi.stubGlobal(
		'fetch',
		vi.fn(async (request: Request) => {
			request.signal.throwIfAborted();
			const key = decodeURIComponent(new URL(request.url).pathname).slice(
				new URL(base).pathname.length + 1
			);
			const data = files.get(key);
			return new Response(data ? data.slice().buffer : null, { status: data ? 200 : 404 });
		})
	);
	return base;
};
beforeEach(() => {
	vi.stubGlobal(
		'ImageData',
		vi.fn().mockImplementation((width: number, height: number) => ({
			data: new Uint8ClampedArray(width * height * 4)
		}))
	);
	vi.stubGlobal(
		'OffscreenCanvas',
		vi.fn().mockImplementation(() => ({
			getContext: () => ({
				putImageData: (image: { data: Uint8ClampedArray; }) => {
					lastPixels = image.data;
				}
			})
		}))
	);
});
afterEach(() => {
	unregisterGeoZarr('test-entry');
	vi.unstubAllGlobals();
});
describe('Zarrの実パーサーからタイル生成まで', () => {
	it.each([2, 3] as const)(
		'v%dのグループ内配列・座標軸・欠損値とscaleを読める',
		async version => {
			const url = setupStore(version);
			const candidates = await listGeoZarrArrayCandidates(url);
			expect(candidates.some(candidate => candidate.arrayPath === 'test-values')).toBe(true);
			const meta = await inspectGeoZarr(url, 'test-values');
			expect(meta.bbox).toEqual([-20, 40, 20, 80]);
			expect(meta.grid.yAscending).toBe(true);
			expect(meta.numBands).toBe(1);
			expect(meta.sampleRanges).toEqual([{ min: 1, max: 29 }]);
		}
	);
	it.each([2, 3] as const)('v%dの配列そのもののURLも候補にできる', async version => {
		const url = setupStore(version, false, true);
		expect(await listGeoZarrArrayCandidates(url)).toMatchObject([{
			arrayPath: '',
			shape: [4, 4]
		}]);
		expect((await inspectGeoZarr(url)).width).toBe(4);
	});
	it.each([false, true])('軸順序が反転=%sでも正しい位置・色・透過で描画する', async transpose => {
		const url = setupStore(3, transpose);
		const meta = await registerGeoZarr({
			entryId: 'test-entry',
			url,
			arrayPath: 'test-values'
		});
		await geozarrProtocol('geozarr').request({
			url: 'geozarr://tile?entryId=test-entry&x=0&y=0&z=0&tileSize=256&min=1&max=29'
		}, new AbortController());
		const palette = new ColorMapManager().createColorArray('jet');
		let painted = 0, noData = 0, zero = 0;
		for (let row = 0; row < 256; row++) {
			for (let col = 0; col < 256; col++) {
				const p = gridPixel(
					meta.grid,
					4,
					4,
					(col + 0.5) / 256 * 360 - 180,
					tileLatitude(0, 0, row, 256)
				);
				const pixel = (row * 256 + col) * 4;
				if (!p || p[0] === 0 && p[1] === 0) {
					expect(lastPixels[pixel + 3]).toBe(0);
					if (p) noData++;
				} else {
					const value = (p[1] * 4 + p[0] - 1) * 2 + 1;
					expect(Array.from(lastPixels.slice(pixel, pixel + 3))).toEqual(
						Array.from(
							palette.slice(
								Math.round((value - 1) / 28 * 255) * 3,
								Math.round((value - 1) / 28 * 255) * 3 + 3
							)
						)
					);
					expect(lastPixels[pixel + 3]).toBe(255);
					painted++;
					if (value === 1) zero++;
				}
			}
		}
		expect(painted).toBeGreaterThan(0);
		expect(noData).toBeGreaterThan(0);
		expect(zero).toBeGreaterThan(0);
	});
	it('Worker再作成後もURLの定義からレイヤーを復元できる', async () => {
		const url = setupStore(3);
		await geozarrProtocol('geozarr').request({
			url: `geozarr://tile?entryId=test-entry&url=${
				encodeURIComponent(url)
			}&arrayPath=test-values&x=0&y=0&z=0`
		}, new AbortController());
		expect(lastPixels.some(value => value > 0)).toBe(true);
	});
	it('STACの外周指定より配列自身の座標格子を優先する', async () => {
		const url = setupStore(3);
		const metadata = await inspectGeoZarr(url, 'test-values', '-180,-90,180,90');
		expect(metadata.bbox).toEqual([-20, 40, 20, 80]);
	});

	it.each([2, 3] as const)(
		'ローカルv%dを通信せず一覧・座標解析・タイル描画する',
		async version => {
			const url = `zarr-local://test-${version}/`;
			const files = [...createTestZarrStore(version)].filter(([path]) =>
				path !== '.zmetadata'
			).map(([path, bytes]) => ({
				path: `test.zarr/${path}`,
				file: new File([bytes as Uint8Array<ArrayBuffer>], path.split('/').pop()!)
			}));
			vi.stubGlobal(
				'fetch',
				vi.fn(() => {
					throw new Error('ローカルデータの通信は禁止');
				})
			);
			mountLocalGeoZarr(url, { type: 'folder', files });
			try {
				expect(
					(await listGeoZarrArrayCandidates(url)).some(item =>
						item.arrayPath === 'test-values'
					)
				).toBe(true);
				const metadata = await registerGeoZarr({
					entryId: 'test-entry',
					url,
					arrayPath: 'test-values'
				});
				expect(metadata.bbox).toEqual([-20, 40, 20, 80]);
				await geozarrProtocol('geozarr').request({
					url: 'geozarr://tile?entryId=test-entry&x=0&y=0&z=0'
				}, new AbortController());
				expect(lastPixels.some(value => value > 0)).toBe(true);
				expect(fetch).not.toHaveBeenCalled();
			} finally {
				unregisterGeoZarr('test-entry');
				releaseLocalGeoZarr(url);
			}
			await expect(inspectGeoZarr(url, 'test-values')).rejects.toThrow('再登録');
		}
	);
	it('ローカルv2の統合メタデータだけでも配列を読み込める', async () => {
		const url = 'zarr-local://test-consolidated/';
		const files = [...createTestZarrStore(2)].filter(([path]) =>
			path === '.zmetadata' || !path.split('/').pop()!.startsWith('.')
		).map(([path, bytes]) => ({
			path: `test.zarr/${path}`,
			file: new File([bytes as Uint8Array<ArrayBuffer>], path.split('/').pop()!)
		}));
		mountLocalGeoZarr(url, { type: 'folder', files });
		try {
			expect(
				(await listGeoZarrArrayCandidates(url)).some(item =>
					item.arrayPath === 'test-values'
				)
			).toBe(true);
			expect((await inspectGeoZarr(url, 'test-values')).sampleRanges).toEqual([{
				min: 1,
				max: 29
			}]);
		} finally {
			releaseLocalGeoZarr(url);
		}
	});
	it('地域索引を持つ配列を登録し、低ズームでは概観チャンクを使用する', async () => {
		const url = 'zarr-local://test-regions/';
		const files = [...createTestRegionalZarr()].map(([path, bytes]) => ({
			path,
			file: new File([bytes as Uint8Array<ArrayBuffer>], path.split('/').pop()!)
		}));
		const detailReads = files.filter(item => item.path.startsWith('detail/c/')).map(item =>
			vi.spyOn(item.file, 'arrayBuffer')
		);
		mountLocalGeoZarr(url, { type: 'folder', files });
		try {
			expect(
				(await listGeoZarrArrayCandidates(url)).find(item => item.arrayPath === 'detail')
					?.columnMaximum
			).toBe(true);
			const metadata = await inspectGeoZarr(url, 'detail');
			expect(metadata.bbox).toEqual([-40, 40, 40, 60]);
			expect(metadata.sampleRanges).toEqual([{ min: 0, max: 8 }]);
			await registerGeoZarr({ entryId: 'test-entry', url, arrayPath: 'detail', metadata });
			await geozarrProtocol('geozarr').request({
				url: 'geozarr://tile?entryId=test-entry&x=0&y=0&z=0&min=0&max=8'
			}, new AbortController());
			expect(lastPixels.some(value => value > 0)).toBe(true);
			for (const read of detailReads) expect(read).not.toHaveBeenCalled();
			expect(metadata.gpm?.height).toEqual({ min: 0, max: 2000, step: 1000 });
			const tile =
				'geozarr://tile?entryId=test-entry&x=13&y=10&z=5&min=0&max=8&gpmMode=height';
			await geozarrProtocol('geozarr').request(
				{ url: `${tile}&gpmHeight=0` },
				new AbortController()
			);
			const lower = lastPixels.slice();
			await geozarrProtocol('geozarr').request(
				{ url: `${tile}&gpmHeight=1000` },
				new AbortController()
			);
			expect(lastPixels).not.toEqual(lower);
			await expect(
				geozarrProtocol('geozarr').request(
					{ url: `${tile}&gpmHeight=invalid` },
					new AbortController()
				)
			).rejects.toThrow('高度指定');
		} finally {
			unregisterGeoZarr('test-entry');
			releaseLocalGeoZarr(url);
		}
	});
	it('キャンセル済みの要求では通信しない', async () => {
		setupStore(3);
		const controller = new AbortController();
		controller.abort();
		await expect(
			geozarrProtocol('geozarr').request({
				url: 'geozarr://tile?entryId=test-entry&x=0&y=0&z=0'
			}, controller)
		).rejects.toMatchObject({ name: 'AbortError' });
		expect(fetch).not.toHaveBeenCalled();
	});
});
