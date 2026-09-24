import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { fetchRobloxAsset, RobloxAssetDeliveryError } from './roblox-asset-delivery';

/** 認証付き取得はローカル開発のみ。本番の静的配信では事前配置を使う。 */
export const robloxAssetsPlugin = (apiKey = ''): Plugin => ({
	name: 'roblox-authenticated-assets',
	apply: 'serve',
	configureServer: server => {
		server.middlewares.use(async (req, res, next) => {
			// 任意配置の素材がないことは正常なフォールバック。SvelteKitの404ログへ渡さない。
			const localResource = /^\/roblox\/(assets\/[1-9]\d*|builtin\/[\w./-]+)$/.exec(
				req.url ?? ''
			)?.[1];
			if (
				req.method === 'GET' && localResource && server.config.publicDir
				&& !localResource.split('/').some(segment =>
					!segment || segment === '.' || segment === '..'
				)
			) {
				try {
					const file = await stat(
						resolve(server.config.publicDir, 'roblox', localResource)
					);
					if (file.isFile()) return next();
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return next(error);
				}
				res.statusCode = 204;
				res.setHeader('Cache-Control', 'no-store');
				res.end();
				return;
			}
			if (!req.url?.startsWith('/api/roblox-auth-assets/')) return next();
			res.setHeader('Cache-Control', 'no-store');
			if (!apiKey) {
				res.statusCode = 404;
				res.end();
				return;
			}
			const id = /^\/api\/roblox-auth-assets\/([1-9]\d{0,19})$/.exec(req.url)?.[1];
			const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(
				req.socket.remoteAddress ?? ''
			);
			const sameOrigin = !req.headers.origin
				|| req.headers.origin === `http://${req.headers.host}`
				|| req.headers.origin === `https://${req.headers.host}`;
			const host = req.headers.host?.split(':')[0];
			const localHost = host === 'localhost' || host === '127.0.0.1'
				|| req.headers.host?.startsWith('[::1]:');
			if (
				req.method !== 'GET' || !id || !local || !localHost || !sameOrigin
				|| req.headers['sec-fetch-site'] === 'cross-site'
			) {
				res.statusCode = 403;
				res.end();
				return;
			}
			try {
				const bytes = await fetchRobloxAsset(id, apiKey);
				res.setHeader('Content-Type', 'application/octet-stream');
				res.end(Buffer.from(bytes));
			} catch (error) {
				res.statusCode = error instanceof RobloxAssetDeliveryError ? error.status : 502;
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify({
					error: error instanceof RobloxAssetDeliveryError
						? error.message
						: 'Roblox素材の通信または応答の読み取りに失敗しました'
				}));
			}
		});
	}
});
