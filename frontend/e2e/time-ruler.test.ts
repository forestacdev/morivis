import { expect, test } from '@playwright/test';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

let script = '';
let stylesheet = '';

test.use({ viewport: { width: 390, height: 500 }, hasTouch: true });

test.beforeAll(async () => {
	// 地図や通信を介さず、本物のコンポーネントをローカルの状態だけで動かす。
	const result = await build({
		configFile: false,
		logLevel: 'error',
		plugins: [svelte({ configFile: false })],
		resolve: {
			alias: {
				$lib: fileURLToPath(new URL('../src/lib', import.meta.url)),
				$routes: fileURLToPath(new URL('../src/routes', import.meta.url))
			}
		},
		build: {
			write: false,
			minify: false,
			lib: {
				entry: fileURLToPath(new URL('./__fixtures__/time-ruler.ts', import.meta.url)),
				formats: ['iife'],
				name: 'TimeRulerTest'
			}
		}
	});
	const bundle = Array.isArray(result) ? result[0] : result;
	if (!('output' in bundle)) throw new Error('Unexpected build output');
	for (const output of bundle.output) {
		if (output.type === 'chunk') script += output.code;
		else if (output.fileName.endsWith('.css')) stylesheet += String(output.source);
	}
});

test.beforeEach(async ({ page }) => {
	await page.setContent('<html><body></body></html>');
	await page.addStyleTag({ content: stylesheet });
	await page.addScriptTag({ content: script });
});

for (const input of ['mouse', 'touch'] as const) {
	test(`${input}: 指を離しても選択時刻を保持し、次のドラッグもその位置から始まる`, async ({ page }) => {
		const slider = page.getByRole('slider', { name: '時間', exact: true });
		const bounds = await slider.boundingBox();
		if (!bounds) throw new Error('Time ruler is not visible');
		const x = bounds.x + 230;
		const y = bounds.y + 40;
		const session = await page.context().newCDPSession(page);
		for (const [gesture, delta, expected] of [[1, -72, 4], [2, -36, 6], [3, 54, 3]]) {
			if (input === 'mouse') {
				await page.mouse.move(x, y);
				await page.mouse.down();
				await page.mouse.move(x + delta, y, { steps: 6 });
			} else {
				await session.send('Input.dispatchTouchEvent', {
					type: 'touchStart',
					touchPoints: [{ x, y }]
				});
				for (let step = 1; step <= 6; step += 1) {
					await session.send('Input.dispatchTouchEvent', {
						type: 'touchMove',
						touchPoints: [{ x: x + delta * step / 6, y }]
					});
				}
			}
			await expect(slider).toHaveAttribute('aria-valuenow', String(expected));
			if (input === 'mouse') {
				await page.mouse.up();
			} else {
				await session.send('Input.dispatchTouchEvent', {
					type: 'touchEnd',
					touchPoints: []
				});
			}
			await expect(slider).toHaveAttribute('aria-valuenow', String(expected));
			await expect(page.getByTestId('current-index')).toHaveText(String(expected));
			await expect(page.getByTestId('commit-count')).toHaveText(String(gesture));
		}
		await session.detach();
	});
}
