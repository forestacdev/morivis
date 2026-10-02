import { test as base } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

// アップロードの画面テストは、補助スタイルの配信先や設定値に依存させない。
const referenceStyle = {
	version: 8,
	sources: {
		'test-reference': {
			type: 'vector',
			tiles: ['https://test.invalid/reference/{z}/{x}/{y}.pbf'],
			maxzoom: 0
		}
	},
	layers: [{
		id: 'test-boundary',
		type: 'line',
		source: 'test-reference',
		'source-layer': 'boundary'
	}]
};

export const test = base.extend({
	context: async ({ context }, use) => {
		await context.route('**/morivis_satellite.json', async route => {
			await route.fulfill({ json: referenceStyle });
		});
		await context.route('https://test.invalid/reference/**', async route => {
			// 空のprotobufは、レイヤーを持たない有効なベクタータイル。
			await route.fulfill({
				contentType: 'application/x-protobuf',
				body: Buffer.alloc(0)
			});
		});
		await use(context);
	}
});
