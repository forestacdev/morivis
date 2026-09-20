import { describe, expect, it, vi } from 'vitest';
import { fetchRobloxAsset } from './roblox-asset-delivery';

describe('Roblox Open Cloud素材取得', () => {
	it.each([
		'https://test.rbxcdn.com/test-image',
		'https://contentdelivery.roblox.com/v1/bytes/test-image'
	])('公式APIにだけキーを送り、配信先%sは認証なしで読む', async location => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
			Response.json({ location })
		).mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));
		expect([...await fetchRobloxAsset('101', 'test-key', fetcher)]).toEqual([1, 2, 3]);
		expect(fetcher.mock.calls[0][0]).toBe(
			'https://apis.roblox.com/asset-delivery-api/v1/assetId/101'
		);
		expect(fetcher.mock.calls[0][1]?.headers).toEqual({ 'x-api-key': 'test-key' });
		expect(fetcher.mock.calls[1][1]?.headers).toBeUndefined();
		expect(fetcher.mock.calls.every(call => call[1]?.redirect === 'error')).toBe(true);
	});
	it.each([
		'https://test.invalid/asset',
		'http://test.rbxcdn.com/asset',
		'https://test.rbxcdn.com:8443/asset',
		'https://user@test.rbxcdn.com/asset',
		'https://contentdelivery.roblox.com.test.invalid/asset',
		'https://contentdelivery.roblox.com@too.invalid/asset',
		'https://test.contentdelivery.roblox.com/asset',
		'not-a-url'
	])('不正な配信先へ接続しない: %s', async location => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ location }));
		await expect(fetchRobloxAsset('101', 'test-key', fetcher)).rejects.toThrow('配信先が不正');
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it('401/403は配信先へ進まず失敗する', async () => {
		for (const status of [401, 403]) {
			const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status }));
			await expect(fetchRobloxAsset('101', 'test-key', fetcher)).rejects.toThrow(
				`HTTP ${status}`
			);
			expect(fetcher).toHaveBeenCalledOnce();
		}
	});
});
