import { expect, test } from '@playwright/test';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

let script = '';

test.beforeAll(async () => {
	// 開発用runtimeでeach_key_duplicateを検出する。通信は架空のdata URLだけ。
	const result = await build({
		configFile: false,
		logLevel: 'error',
		plugins: [svelte({ configFile: false, compilerOptions: { dev: true } })],
		define: { 'process.env.NODE_ENV': JSON.stringify('development') },
		resolve: {
			conditions: ['browser', 'development'],
			alias: {
				$lib: fileURLToPath(new URL('../src/lib', import.meta.url)),
				$routes: fileURLToPath(new URL('../src/routes', import.meta.url))
			}
		},
		build: {
			write: false,
			minify: false,
			lib: {
				entry: fileURLToPath(
					new URL('./__fixtures__/categorical-legend.ts', import.meta.url)
				),
				formats: ['iife'],
				name: 'CategoricalLegendTest'
			}
		}
	});
	const bundle = Array.isArray(result) ? result[0] : result;
	if (!('output' in bundle)) throw new Error('Unexpected build output');
	script = bundle.output.filter(output => output.type === 'chunk').map(output => output.code)
		.join('\n');
});

test('重複する凡例を省略せず表示し、内容や形式を切り替えられる', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.setContent('<html><body></body></html>');
	await page.addScriptTag({ content: script });
	await expect(page.getByRole('img', { name: 'test-label', exact: true })).toHaveCount(4);
	await expect(page.getByRole('heading', { name: 'test-group', exact: true })).toHaveCount(2);

	await page.getByRole('button', { name: 'test-replace', exact: true }).click();
	await expect(page.getByRole('img', { name: 'test-new-label', exact: true })).toHaveCount(1);
	await expect(page.getByRole('img', { name: 'test-label', exact: true })).toHaveCount(0);

	await page.getByRole('button', { name: 'test-category', exact: true }).click();
	await expect(page.getByText('test-color', { exact: true })).toHaveCount(2);
	await expect(page.getByRole('img')).toHaveCount(0);

	await page.getByRole('button', { name: 'test-images', exact: true }).click();
	await expect(page.getByRole('img', { name: 'test-label', exact: true })).toHaveCount(4);
	expect(errors).toEqual([]);
});
