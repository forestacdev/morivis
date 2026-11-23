import { createPointTile } from '$routes/map/utils/formats/mlt/__fixtures__/point';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, expect, it, vi } from 'vitest';
import {
	createThumbnailStyle,
	createThumbnailView,
	type ThumbnailResourceRequest,
	type ThumbnailResourceResponse
} from './thumbnail';

afterEach(() => vi.unstubAllGlobals());

it('Workerのリソース応答からMLTを変換し、実WASMでWebPを返す', async () => {
	vi.resetModules();
	vi.stubGlobal('onmessage', null);
	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			new Response(
				readFileSync(
					createRequire(import.meta.url).resolve('@ml2drender/wasm/renderer.wasm')
				)
			)
		)
	);
	const results: Blob[] = [];
	const requests: string[] = [];
	vi.stubGlobal(
		'postMessage',
		(message: ThumbnailResourceRequest | { blob: Blob; } | { error: string; }) => {
			if ('type' in message) {
				requests.push(message.url);
				const response: ThumbnailResourceResponse = {
					type: 'resource',
					id: message.id,
					bytes: createPointTile(),
					encoding: 'mlt'
				};
				(globalThis.onmessage as ((event: MessageEvent) => Promise<void>) | null)?.(
					new MessageEvent('message', { data: response })
				);
			} else if ('error' in message) throw new Error(message.error);
			else results.push(message.blob);
		}
	);
	await import('./thumbnail.worker');
	const style = createThumbnailStyle({
		version: 8,
		sources: {
			'test-vector': {
				type: 'vector',
				encoding: 'mlt',
				tiles: ['https://test.invalid/{z}/{x}/{y}.mlt'],
				maxzoom: 0
			}
		},
		layers: [{
			id: 'test-point',
			type: 'circle',
			source: 'test-vector',
			'source-layer': 'test-layer',
			paint: { 'circle-radius': 8, 'circle-color': '#ff0000' }
		}]
	});
	await (globalThis.onmessage as ((event: MessageEvent) => Promise<void>) | null)?.(
		new MessageEvent('message', {
			data: {
				styleJson: JSON.stringify(style),
				view: createThumbnailView([-180, -85, 180, 85]),
				baseUrl: 'https://test.invalid/'
			}
		})
	);
	expect(requests).toContain('thumbnail-mlt://https://test.invalid/0/0/0.mlt');
	expect(results).toHaveLength(1);
	expect(results[0].type).toBe('image/webp');
	expect(new TextDecoder().decode((await results[0].arrayBuffer()).slice(8, 12))).toBe('WEBP');
});
