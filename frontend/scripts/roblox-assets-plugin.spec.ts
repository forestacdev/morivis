import { stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Connect, ViteDevServer } from 'vite';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRobloxAsset, RobloxAssetDeliveryError } from './roblox-asset-delivery';
import { robloxAssetsPlugin } from './roblox-assets-plugin';

vi.mock('node:fs/promises', () => ({ stat: vi.fn() }));
vi.mock('./roblox-asset-delivery', async original => ({
	...await original<typeof import('./roblox-asset-delivery')>(),
	fetchRobloxAsset: vi.fn()
}));
beforeEach(() => vi.clearAllMocks());

const request = async (url: string, host = 'localhost:1234') => {
	let handler: Connect.NextHandleFunction | undefined;
	const plugin = robloxAssetsPlugin('test-key');
	if (typeof plugin.configureServer !== 'function') throw new Error('configureServerなし');
	await plugin.configureServer.call({} as never, {
		config: { publicDir: 'test-static' },
		middlewares: {
			use: (middleware: Connect.NextHandleFunction) => {
				handler = middleware;
			}
		}
	} as unknown as ViteDevServer);
	const req = { url, method: 'GET', headers: { host }, socket: { remoteAddress: '127.0.0.1' } };
	const res = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
	const next = vi.fn();
	await handler!(req as IncomingMessage, res as unknown as ServerResponse, next);
	return { res, next };
};

describe('Roblox開発用素材ルート', () => {
	it('未配置は204を返してSvelteKitの404処理へ進めない', async () => {
		vi.mocked(stat).mockRejectedValueOnce(
			Object.assign(new Error('missing'), { code: 'ENOENT' })
		);
		const { res, next } = await request('/roblox/assets/101');
		expect(res.statusCode).toBe(204);
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
		expect(next).not.toHaveBeenCalled();
	});
	it('配置済みの素材はViteの静的ファイル配信へ渡す', async () => {
		vi.mocked(stat).mockResolvedValueOnce(
			{ isFile: () => true } as Awaited<ReturnType<typeof stat>>
		);
		const { res, next } = await request('/roblox/builtin/textures/test.png');
		expect(next).toHaveBeenCalledOnce();
		expect(res.end).not.toHaveBeenCalled();
	});
	it('素材以外のURLとパスの遡行はファイル照会しない', async () => {
		for (const path of ['/test-missing', '/roblox/builtin/../test']) {
			const { next } = await request(path);
			expect(next).toHaveBeenCalledOnce();
		}
		expect(stat).not.toHaveBeenCalled();
	});
	it('上流のステータスと管理されたエラーメッセージを返す', async () => {
		vi.mocked(fetchRobloxAsset).mockRejectedValueOnce(
			new RobloxAssetDeliveryError('Roblox API: HTTP 429', 429)
		);
		const { res } = await request('/api/roblox-auth-assets/101');
		expect(res.statusCode).toBe(429);
		expect(JSON.parse(res.end.mock.calls[0][0])).toEqual({ error: 'Roblox API: HTTP 429' });
	});
	it('予期しない例外の詳細をブラウザへ転送しない', async () => {
		vi.mocked(fetchRobloxAsset).mockRejectedValueOnce(new Error('test-private-detail'));
		const { res } = await request('/api/roblox-auth-assets/101');
		expect(res.statusCode).toBe(502);
		expect(res.end.mock.calls[0][0]).not.toContain('test-private-detail');
	});
	it('ローカル以外のHostへ認証付き取得を公開しない', async () => {
		const { res } = await request('/api/roblox-auth-assets/101', 'test.invalid');
		expect(res.statusCode).toBe(403);
		expect(fetchRobloxAsset).not.toHaveBeenCalled();
	});
});
