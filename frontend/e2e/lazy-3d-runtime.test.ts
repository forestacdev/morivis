import { readFileSync } from 'node:fs';
import { createMetadataGlb } from '../src/routes/map/utils/tiles3d/__fixtures__/tiles';
import { expect, type Page, test } from './map-test';

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
	await page.route('**/*', async route => {
		const url = new URL(route.request().url());
		if (
			url.hostname === '127.0.0.1' || url.hostname === 'test.invalid'
			|| url.pathname.endsWith('/morivis_satellite.json')
		) await route.fallback();
		else await route.abort();
	});
});

const getRuntimeFiles = () => {
	const manifest = JSON.parse(
		readFileSync(
			new URL('../.svelte-kit/output/client/.vite/manifest.json', import.meta.url),
			'utf8'
		)
	) as Record<string, { file: string; }>;
	return Object.fromEntries([
		'src/routes/map/components/model_view/ModelViewCanvas.svelte',
		'src/routes/map/components/street_view/ThreeCanvas.svelte',
		'src/routes/map/components/layer_style_menu/ModelOptionMenu.svelte',
		'src/routes/map/utils/deck/runtime.ts',
		'src/routes/map/utils/tiles3d/layer-manager.ts',
		'src/routes/map/utils/voxel/layer-manager.ts'
	].map(key => {
		expect(manifest[key], `${key} が使用時に読み込む別ファイルであること`).toBeDefined();
		return [key, manifest[key].file];
	}));
};

const dropText = async (page: Page, name: string, text: string) => {
	await page.locator('canvas.maplibregl-canvas:visible').first().evaluate((canvas, file) => {
		const transfer = new DataTransfer();
		transfer.items.add(new File([file.text], file.name));
		canvas.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
	}, { name, text });
};

test('通常の地図操作では3D描画モジュールを取得しない', async ({ page }) => {
	test.skip(process.env.PLAYWRIGHT_DEV === '1', '本番ビルドのチャンク分離を確認する');
	const files = getRuntimeFiles();
	const requested: string[] = [];
	page.on('request', request => requested.push(new URL(request.url()).pathname));
	await page.goto('./map?c=0_0&z=14&p=0&b=0', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await expect(canvas).toBeVisible();
	await canvas.click();
	await expect.poll(() =>
		page.evaluate(() =>
			(window as typeof window & { __morivis_map_idle?: boolean; }).__morivis_map_idle
		)
	).toBe(true);
	for (const file of Object.values(files)) {
		expect(requested.some(url => url.endsWith(`/${file}`)), file).toBe(false);
	}
});

test('初めての点群登録でdeck.glを読み込み、描画する', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await page.addInitScript(() => {
		const state = window as typeof window & { testPointDraws: number; };
		state.testPointDraws = 0;
		const method = WebGL2RenderingContext.prototype.drawArraysInstanced;
		WebGL2RenderingContext.prototype.drawArraysInstanced = new Proxy(method, {
			apply: (target, gl: WebGL2RenderingContext, args) => {
				// deck.glのPointCloudLayerは、点ごとの三角形をinstancingで描画する。
				const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
				if (
					program
					&& gl.getAttachedShaders(program)?.some(shader =>
						gl.getShaderSource(shader)?.includes('point-cloud-layer')
					)
				) state.testPointDraws++;
				return Reflect.apply(target, gl, args);
			}
		});
	});
	await page.goto('./map?c=0_0&z=14&p=0&b=0', { waitUntil: 'domcontentloaded' });
	await dropText(page, 'test-points.xyz', '0 0 0\n0.001 0 1\n0 0.001 2\n');
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect.poll(() =>
		page.evaluate(() => (window as typeof window & { testPointDraws: number; }).testPointDraws)
	).toBeGreaterThan(0);
	expect(errors).toEqual([]);
});

test('初めての3D Tiles登録で描画エンジンを読み込む', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	const requested: string[] = [];
	page.on('request', request => requested.push(request.url()));
	await page.route(
		'https://test.invalid/test-tile.glb',
		route =>
			route.fulfill({
				contentType: 'model/gltf-binary',
				body: Buffer.from(createMetadataGlb())
			})
	);
	await page.goto('./map?c=0_0&z=14&p=0&b=0', { waitUntil: 'domcontentloaded' });
	await dropText(
		page,
		'test-tileset.json',
		JSON.stringify({
			asset: { version: '1.1' },
			geometricError: 0,
			root: {
				boundingVolume: { box: [0, 0, 0, 100, 0, 0, 0, 100, 0, 0, 0, 100] },
				transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 6378137, 0, 0, 1],
				geometricError: 0,
				content: { uri: 'https://test.invalid/test-tile.glb' }
			}
		})
	);
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	if (process.env.PLAYWRIGHT_DEV !== '1') {
		const file = getRuntimeFiles()['src/routes/map/utils/tiles3d/layer-manager.ts'];
		await expect.poll(() => requested.some(url => url.endsWith(`/${file}`))).toBe(true);
	}
	await expect.poll(() => requested.includes('https://test.invalid/test-tile.glb')).toBe(true);
	await expect(page.getByText('test-tileset', { exact: true }).first()).toBeVisible();
	expect(errors).toEqual([]);
});
