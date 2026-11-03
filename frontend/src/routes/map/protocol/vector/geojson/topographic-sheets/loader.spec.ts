import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSheetDataLoader } from './loader';

afterEach(() => vi.unstubAllGlobals());
describe('図郭タイルの取得', () => {
	it('同時要求と拡大後の要求で配信タイルを再取得しない', async () => {
		const fetch = vi.fn(async () => new Response(JSON.stringify({ type: 'FeatureCollection', features: [] })));
		vi.stubGlobal('fetch', fetch);
		const load = createSheetDataLoader(new AbortController().signal);
		const tile = { scale: 25000 as const, z: 11, x: 1024, y: 1024 };
		await Promise.all([load(tile), load(tile)]);
		expect(fetch).toHaveBeenCalledTimes(9);
		await load({ ...tile, z: 12, x: 2048, y: 2048 });
		expect(fetch).toHaveBeenCalledTimes(9);
	});
	it('404は空タイルとし、サーバーエラーは通知して再試行できる', async () => {
		let status = 503;
		vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status })));
		const load = createSheetDataLoader(new AbortController().signal);
		const tile = { scale: 25000 as const, z: 11, x: 1024, y: 1024 };
		await expect(load(tile)).rejects.toThrow('(503)');
		status = 404;
		await expect(load(tile)).resolves.toEqual({ type: 'FeatureCollection', features: [] });
	});
});
