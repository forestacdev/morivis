/**
 * COG プロキシエンドポイント
 *
 * CORS制限のあるCOG（Cloud Optimized GeoTIFF）をプロキシする。
 * Range requestを転送し、geotiff.jsのHTTPレンジリクエストに対応。
 *
 * 使用例: /api/cog-proxy?url=https://example.com/data.tif
 */

import type { RequestHandler } from './$types';

const ALLOWED_EXTENSIONS = ['.tif', '.tiff', '.geotiff'];
const MAX_URL_LENGTH = 2048;

export const GET: RequestHandler = async ({ url, request }) => {
	const targetUrl = url.searchParams.get('url');

	if (!targetUrl) {
		return new Response('Missing url parameter', { status: 400 });
	}

	if (targetUrl.length > MAX_URL_LENGTH) {
		return new Response('URL too long', { status: 400 });
	}

	// URLバリデーション
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(targetUrl);
	} catch {
		return new Response('Invalid URL', { status: 400 });
	}

	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
		return new Response('Only HTTP(S) URLs allowed', { status: 400 });
	}

	// リクエストヘッダーからRangeを転送
	const headers: Record<string, string> = {};
	const range = request.headers.get('Range');
	if (range) {
		headers['Range'] = range;
	}

	try {
		const res = await fetch(targetUrl, { headers });

		// レスポンスヘッダーを転送（CORS付き）
		const responseHeaders = new Headers();
		responseHeaders.set('Access-Control-Allow-Origin', '*');

		// COG関連ヘッダーを転送
		const forwardHeaders = ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges'];
		for (const h of forwardHeaders) {
			const val = res.headers.get(h);
			if (val) responseHeaders.set(h, val);
		}

		return new Response(res.body, {
			status: res.status,
			headers: responseHeaders
		});
	} catch (e) {
		console.error('COG proxy error:', e);
		return new Response('Proxy fetch failed', { status: 502 });
	}
};

/** HEADリクエスト（ファイルサイズ取得用） */
export const HEAD: RequestHandler = async ({ url }) => {
	const targetUrl = url.searchParams.get('url');
	if (!targetUrl) return new Response(null, { status: 400 });

	try {
		const res = await fetch(targetUrl, { method: 'HEAD' });
		const responseHeaders = new Headers();
		responseHeaders.set('Access-Control-Allow-Origin', '*');

		const forwardHeaders = ['Content-Type', 'Content-Length', 'Accept-Ranges'];
		for (const h of forwardHeaders) {
			const val = res.headers.get(h);
			if (val) responseHeaders.set(h, val);
		}

		return new Response(null, { status: res.status, headers: responseHeaders });
	} catch {
		return new Response(null, { status: 502 });
	}
};

/** OPTIONSリクエスト（プリフライト）対応 */
export const OPTIONS: RequestHandler = async () =>
	new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
			'Access-Control-Allow-Headers': 'Range'
		}
	});
