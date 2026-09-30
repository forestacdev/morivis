import { expect, type Page, test } from '@playwright/test';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import { createTestRegionalZarr } from '../src/routes/map/utils/formats/geozarr/__fixtures__/test-regions';
import { createTestZarrStore } from '../src/routes/map/utils/formats/geozarr/__fixtures__/test-store';

// 起動時の外部ストリートビュー取得は架空fixtureで固定する。
test.beforeEach(async ({ page }) => {
	await page.route('**/assets/street_view/*', async route => {
		if (new URL(route.request().url()).pathname.endsWith('.fgb')) {
			await route.fulfill({
				contentType: 'application/octet-stream',
				body: readFileSync(
					new URL(
						'../src/routes/map/utils/formats/video/__fixtures__/test-empty.fgb',
						import.meta.url
					)
				)
			});
		} else await route.fulfill({ contentType: 'application/json', body: '{}' });
	});
});

const finishRegistration = async (page: Page, arrayPath = 'test-values', voxel = false) => {
	await expect(page.getByRole('heading', { name: 'GeoZarr を追加' })).toBeVisible();
	await expect(page.getByText(/読み込み元:/)).toBeVisible();
	await page.getByRole('button', { name: '候補を解析', exact: true }).click();
	await expect(page.locator(`select option[value="${arrayPath}"]`)).toHaveCount(1);
	await page.locator('select').filter({ has: page.locator(`option[value="${arrayPath}"]`) })
		.selectOption(arrayPath);
	if (arrayPath === 'detail') {
		await expect(page.getByText(/高度方向の最大値を表示/)).toBeVisible();
	}
	if (voxel) await page.getByRole('button', { name: 'ボクセル表示', exact: true }).click();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText(arrayPath, { exact: true }).first()).toBeVisible();
	await expect(page.locator('.loader')).toHaveCount(0);
};
test('Zarrフォルダーのドロップで相対パスを保持し、登録できる', async ({ page }) => {
	await page.goto('map?c=0_60&z=3', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await canvas.waitFor();
	const files = [...createTestZarrStore(2)].map(([path, bytes]) => ({ path, bytes: [...bytes] }));
	await canvas.evaluate((canvas, files) => {
		// OSのディレクトリエントリーと同じ、繰り返しreadEntriesする形でドロップする。
		const directory = (name: string, prefix: string): object => {
			const names = [
				...new Set(
					files.filter(file => file.path.startsWith(prefix)).map(file =>
						file.path.slice(prefix.length).split('/')[0]
					)
				)
			];
			return {
				name,
				isDirectory: true,
				isFile: false,
				createReader: () => {
					let offset = 0;
					return {
						readEntries: (success: (entries: object[]) => void) => {
							const entries = names.slice(offset, offset + 2).map(name => {
								const path = prefix + name;
								const input = files.find(file => file.path === path);
								return input
									? {
										name,
										isDirectory: false,
										isFile: true,
										file: (done: (file: File) => void) =>
											done(new File([new Uint8Array(input.bytes)], name))
									}
									: directory(name, `${path}/`);
							});
							offset += 2;
							success(entries);
						}
					};
				}
			};
		};
		const transfer = new DataTransfer();
		transfer.items.add(new File([], 'test.zarr'));
		Object.defineProperty(transfer, 'items', {
			value: [{
				webkitGetAsEntry: () => directory('test.zarr', ''),
				getAsFile: () => null
			}]
		});
		canvas.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
	}, files);
	await finishRegistration(page);
});

test('Zarr ZIPのドロップをWorkerで読み、登録できる', async ({ page }) => {
	const zip = new JSZip();
	for (const [path, bytes] of createTestZarrStore(3)) zip.file(`test.zarr/${path}`, bytes);
	const bytes = [...await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })];
	await page.goto('map?c=0_60&z=3', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await canvas.waitFor();
	await canvas.evaluate((canvas, bytes) => {
		const transfer = new DataTransfer();
		transfer.items.add(
			new File([new Uint8Array(bytes)], 'test.zarr.zip', { type: 'application/zip' })
		);
		canvas.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
	}, bytes);
	await finishRegistration(page);
});

test('地域索引付きZarrをbbox入力なしで登録できる', async ({ page }) => {
	const zip = new JSZip();
	for (const [path, bytes] of createTestRegionalZarr()) zip.file(`test.zarr/${path}`, bytes);
	const bytes = [...await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })];
	await page.goto('map?c=0_60&z=3', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await canvas.waitFor();
	await canvas.evaluate((canvas, bytes) => {
		const transfer = new DataTransfer();
		transfer.items.add(
			new File([new Uint8Array(bytes)], 'test-regions.zarr.zip', { type: 'application/zip' })
		);
		canvas.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
	}, bytes);
	await finishRegistration(page, 'detail');
	const item = page.locator('[data-layer-id]').filter({
		has: page.getByText('detail', { exact: true })
	}).first();
	await item.hover();
	await item.locator('button').filter({ has: page.locator('svg') }).last().click();
	const settings = page.getByRole('region', { name: 'Zarrの高度設定' });
	await expect(settings.getByText('高度方向の最大値を表示しています。')).toBeVisible();
	await settings.getByText('指定高度の断面', { exact: true }).click();
	await expect(settings.getByText('高度 0〜1,000 m', { exact: true })).toBeVisible();
	const slider = settings.locator('input[type="range"]');
	await slider.fill('1000');
	await expect(settings.getByText('高度 1,000〜2,000 m', { exact: true })).toBeVisible();
	await settings.getByText('指定高度の断面', { exact: true }).click();
	await expect(settings.getByText('高度方向の最大値を表示しています。')).toBeVisible();
});

test('Zarr登録でボクセルを選択し、GPU描画と設定変更ができる', async ({ page }, testInfo) => {
	const errors: string[] = [];
	page.on('console', message => {
		if (message.type() === 'error' && /THREE|Shader|ボクセル|Zarr/.test(message.text())) {
			errors.push(message.text());
		}
	});
	page.on('pageerror', error => errors.push(error.message));
	await page.addInitScript(() => {
		const target = window as unknown as { testVoxelDraws: number; testVoxelInstances: number; };
		target.testVoxelDraws = 0;
		target.testVoxelInstances = 0;

		const original = WebGL2RenderingContext.prototype.drawElementsInstanced;
		WebGL2RenderingContext.prototype.drawElementsInstanced = new Proxy(original, {
			apply: (method, context, args) => {
				const [, count, , , instances] = args;
				if (count === 36 && instances > 0) {
					target.testVoxelDraws++;
					target.testVoxelInstances = instances;
				}
				return Reflect.apply(method, context, args);
			}
		});
	});
	const zip = new JSZip();
	for (const [path, bytes] of createTestRegionalZarr()) zip.file(`test.zarr/${path}`, bytes);
	const bytes = [...await zip.generateAsync({ type: 'uint8array' })];
	await page.goto('map?c=0_50&z=3&p=45&b=0', { waitUntil: 'domcontentloaded' });
	const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
	await canvas.waitFor();
	await canvas.evaluate((canvas, bytes) => {
		const transfer = new DataTransfer();
		transfer.items.add(
			new File([new Uint8Array(bytes)], 'test-voxel.zarr.zip', { type: 'application/zip' })
		);
		canvas.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
	}, bytes);
	await finishRegistration(page, 'detail', true);
	await expect.poll(() =>
		page.evaluate(() => (window as unknown as { testVoxelDraws: number; }).testVoxelDraws)
	).toBeGreaterThan(0).catch(async error => {
		await page.screenshot({ path: testInfo.outputPath('voxel-failure.png') });
		throw new Error(`${error}\nBrowser errors: ${errors.join('\n')}`);
	});
	const item = page.locator('[data-layer-id]').filter({
		has: page.getByText('detail', { exact: true })
	}).first();
	await item.hover();
	await item.locator('button').filter({ has: page.locator('svg') }).last().click();
	const settings = page.getByRole('region', { name: 'ボクセル設定' });
	await expect(settings).toBeVisible();
	await expect(page.getByRole('region', { name: 'Zarrの高度設定' })).toHaveCount(0);
	await settings.locator('input[type="range"]').nth(1).fill('5');
	await expect(settings.getByText('5', { exact: true })).toBeVisible();
	const previous = await page.evaluate(() =>
		(window as unknown as { testVoxelDraws: number; }).testVoxelDraws
	);
	await settings.locator('input[type="range"]').first().fill('1');
	await expect.poll(() =>
		page.evaluate(() => (window as unknown as { testVoxelDraws: number; }).testVoxelDraws)
	).toBeGreaterThan(previous);
	await page.screenshot({ path: testInfo.outputPath('voxels-mercator.png') });
	await page.locator('button.pointer-events-auto.grid.shrink-0').nth(2).click();
	const beforeGlobe = await page.evaluate(() =>
		(window as unknown as { testVoxelDraws: number; }).testVoxelDraws
	);
	await page.getByText('地球儀表示', { exact: true }).click();
	await expect.poll(() =>
		page.evaluate(() => (window as unknown as { testVoxelDraws: number; }).testVoxelDraws)
	).toBeGreaterThan(beforeGlobe);
	await page.getByText('ベースマップ', { exact: true }).locator('..').getByRole('button').click();
	await page.screenshot({ path: testInfo.outputPath('voxels-globe.png') });
	expect(errors).toEqual([]);
});
