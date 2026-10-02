import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import { createTestRegionalZarr } from '../src/routes/map/utils/formats/geozarr/__fixtures__/test-regions';
import { createTestZarrStore } from '../src/routes/map/utils/formats/geozarr/__fixtures__/test-store';
import { expect, type Page, test } from './map-test';

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

const finishRegistration = async (
	page: Page,
	arrayPath = 'test-values',
	mode: 'raster' | 'voxel' | 'volume' = 'raster'
) => {
	await expect(page.getByRole('heading', { name: 'GeoZarr を追加' })).toBeVisible();
	await expect(page.getByText(/読み込み元:/)).toBeVisible();
	await expect(page.getByRole('button', { name: '候補を解析', exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: '決定', exact: true }).click();
	if (arrayPath === 'detail') {
		await expect(page.locator(`select option[value="${arrayPath}"]`)).toHaveCount(1);
		await page.locator('#geozarr-array-select').selectOption(arrayPath);
		await expect(page.getByText(/高度方向の最大値を表示/)).toBeVisible();
		if (mode !== 'raster') {
			await page.getByRole('button', {
				name: mode === 'volume' ? 'ボリューム表示' : 'ボクセル表示',
				exact: true
			}).click();
		}
		await page.getByRole('button', { name: '決定', exact: true }).click();
	}
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText(arrayPath, { exact: true }).first()).toBeVisible();
	await expect(page.locator('.loader')).toHaveCount(0);
};

test('URLから配列候補を自動展開し、変更前の遅い応答を反映せず決定1回で登録する', async ({ page, context }) => {
	const store = createTestZarrStore(3);
	let releaseOld = () => {};
	const oldResponse = new Promise<void>(resolve => {
		releaseOld = resolve;
	});
	let oldRequested = false;
	let oldReturned = false;
	await context.route('**/test-auto-*.zarr/**', async route => {
		const url = new URL(route.request().url());
		const old = url.pathname.includes('test-auto-old.zarr');
		if (old) {
			oldRequested = true;
			await oldResponse;
		}
		const path = url.pathname.split('.zarr/')[1].replace(/test-(old|new)/g, 'test-values');
		const bytes = store.get(path);
		await route.fulfill(
			bytes
				? {
					contentType: 'application/json',
					body: path.endsWith('.json')
						? Buffer.from(
							new TextDecoder().decode(bytes).replaceAll(
								'test-values',
								old ? 'test-old' : 'test-new'
							)
						)
						: Buffer.from(bytes)
				}
				: { status: 404 }
		);
		if (old) oldReturned = true;
	});
	await page.goto('map?c=0_60&z=3', { waitUntil: 'domcontentloaded' });
	await page.getByRole('button', { name: 'データ一覧を見る', exact: true }).click();
	await page.getByRole('button', { name: 'アップロード', exact: true }).click();
	const source = new URL('test-auto-old.zarr', page.url()).href;
	await page.getByPlaceholder('URLから読み込む').fill(source);
	await page.getByRole('button', { name: 'URLを開く', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'GeoZarr を追加' })).toBeVisible();
	await expect.poll(() => oldRequested).toBe(true);
	await expect(page.getByRole('status')).toContainText('GeoZarr を読み込んでいます');
	await expect(page.getByRole('button', { name: '決定', exact: true })).toBeDisabled();
	await page.getByLabel('URL', { exact: true }).fill(
		source.replace('test-auto-old', 'test-auto-new')
	);
	await expect(page.getByLabel('配列候補')).toHaveValue('test-new');
	await expect(page.getByText('配列: test-new', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toHaveCount(0);
	releaseOld();
	await expect.poll(() => oldReturned).toBe(true);
	await expect(page.getByRole('status')).toHaveCount(0);
	await expect(page.getByLabel('配列候補')).toHaveValue('test-new');
	await expect(page.locator('select option[value="test-old"]')).toHaveCount(0);
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
	await expect(page.getByText('test-new', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('test-old', { exact: true })).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'GeoZarr を追加' })).toHaveCount(0);
});

test('複数配列のURLも決定前に候補と登録方法を選べる', async ({ page, context }) => {
	const store = createTestRegionalZarr();
	const readMetadata = (path: string) => JSON.parse(new TextDecoder().decode(store.get(path)));
	// HTTP配信ではフォルダーを列挙できないため、配列一覧を集約メタデータに含める。
	store.set(
		'zarr.json',
		new TextEncoder().encode(JSON.stringify({
			...readMetadata('zarr.json'),
			consolidated_metadata: {
				kind: 'inline',
				must_understand: false,
				metadata: {
					overview: readMetadata('overview/zarr.json'),
					detail: readMetadata('detail/zarr.json')
				}
			}
		}))
	);
	await context.route('**/test-choices.zarr/**', async route => {
		const path = new URL(route.request().url()).pathname.split('.zarr/')[1];
		const bytes = store.get(path);
		await route.fulfill(bytes ? { body: Buffer.from(bytes) } : { status: 404 });
	});
	await page.goto('map?c=0_60&z=3', { waitUntil: 'domcontentloaded' });
	await page.getByRole('button', { name: 'データ一覧を見る', exact: true }).click();
	await page.getByRole('button', { name: 'アップロード', exact: true }).click();
	await page.getByPlaceholder('URLから読み込む').fill(
		new URL('test-choices.zarr', page.url()).href
	);
	await page.getByRole('button', { name: 'URLを開く', exact: true }).click();
	await page.getByLabel('配列候補').selectOption('detail');
	await expect(page.getByText('配列: detail', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'ボクセル表示', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
});

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

for (const mode of ['voxel', 'volume'] as const) {
	test(`Zarr ${mode}のGPU描画と設定変更ができる`, async ({ page }, testInfo) => {
		const errors: string[] = [];
		page.on('console', message => {
			if (message.type() === 'error' && /THREE|Shader|ボクセル|Zarr/.test(message.text())) {
				errors.push(message.text());
			}
		});
		page.on('pageerror', error => errors.push(error.message));
		await page.addInitScript((mode) => {
			const target = window as unknown as {
				testVoxelDraws: number;
				testVoxelInstances: number;
			};
			target.testVoxelDraws = 0;
			target.testVoxelInstances = 0;

			if (mode === 'volume') {
				const draw = WebGL2RenderingContext.prototype.drawElements;
				WebGL2RenderingContext.prototype.drawElements = new Proxy(draw, {
					apply: (method, gl: WebGL2RenderingContext, args) => {
						const program = gl.getParameter(gl.CURRENT_PROGRAM);
						if (program && gl.getUniformLocation(program, 'volumeTexture') !== null) {
							target.testVoxelDraws++;
							const capture = window as unknown as {
								testVolumeCapture: number;
								testVolumePixels: number;
							};
							if (capture.testVolumeCapture > 0) {
								capture.testVolumeCapture--;
								const width = gl.drawingBufferWidth,
									height = gl.drawingBufferHeight;
								const before = new Uint8Array(width * height * 4),
									after = new Uint8Array(before.length);
								gl.readPixels(
									0,
									0,
									width,
									height,
									gl.RGBA,
									gl.UNSIGNED_BYTE,
									before
								);
								const result = Reflect.apply(method, gl, args);
								gl.readPixels(
									0,
									0,
									width,
									height,
									gl.RGBA,
									gl.UNSIGNED_BYTE,
									after
								);
								for (let i = 0; i < before.length; i += 4) {
									if (
										Math.abs(before[i] - after[i])
												+ Math.abs(before[i + 1] - after[i + 1])
												+ Math.abs(before[i + 2] - after[i + 2]) > 3
									) capture.testVolumePixels++;
								}
								return result;
							}
						}
						return Reflect.apply(method, gl, args);
					}
				});
				return;
			}

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
		}, mode);
		const zip = new JSZip();
		const files = createTestRegionalZarr();
		if (mode === 'volume') {
			// 詳細格子の補間と高さが見える、狭い架空領域に配置する。
			const metadata = JSON.parse(new TextDecoder().decode(files.get('zarr.json')));
			metadata.attributes.gpm.tiles.forEach(
				(tile: { bounds: Record<string, number>; }, index: number) => {
					tile.bounds = {
						west: index === 0 ? -0.4 : 0.1,
						east: index === 0 ? -0.1 : 0.4,
						south: 49.8,
						north: 50.2,
						minHeight: 0,
						maxHeight: 2000
					};
				}
			);
			files.set('zarr.json', new TextEncoder().encode(JSON.stringify(metadata)));
		}
		for (const [path, bytes] of files) {
			zip.file(`test.zarr/${path}`, bytes);
		}
		const bytes = [...await zip.generateAsync({ type: 'uint8array' })];
		await page.goto(
			mode === 'volume' ? 'map?c=0_50&z=9&p=60&b=20' : 'map?c=0_50&z=3&p=45&b=0',
			{ waitUntil: 'domcontentloaded' }
		);
		const canvas = page.locator('canvas.maplibregl-canvas:visible').first();
		await canvas.waitFor();
		await canvas.evaluate((canvas, bytes) => {
			const transfer = new DataTransfer();
			transfer.items.add(
				new File([new Uint8Array(bytes)], 'test-voxel.zarr.zip', {
					type: 'application/zip'
				})
			);
			canvas.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
		}, bytes);
		await finishRegistration(page, 'detail', mode);
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
		const settings = page.getByRole('region', {
			name: mode === 'volume' ? 'ボリューム設定' : 'ボクセル設定'
		});
		await expect(settings).toBeVisible();
		await expect(page.getByRole('region', { name: 'Zarrの高度設定' })).toHaveCount(0);
		await settings.locator('input[type="range"]').nth(1).fill('5');
		await expect(settings.getByText('5', { exact: true })).toBeVisible();
		const previous = await page.evaluate(() =>
			(window as unknown as { testVoxelDraws: number; }).testVoxelDraws
		);
		await settings.locator('input[type="range"]').first().fill('1');
		if (mode === 'volume') {
			await settings.locator('input[type="range"]').nth(2).fill('4');
		}
		await expect.poll(() =>
			page.evaluate(() => (window as unknown as { testVoxelDraws: number; }).testVoxelDraws)
		).toBeGreaterThan(previous);
		await page.screenshot({ path: testInfo.outputPath(`${mode}-mercator.png`) });
		await page.locator('button.pointer-events-auto.grid.shrink-0').nth(2).click();
		const beforeGlobe = await page.evaluate(() =>
			(window as unknown as { testVoxelDraws: number; }).testVoxelDraws
		);
		await page.getByText('地球儀表示', { exact: true }).click();
		await expect.poll(() =>
			page.evaluate(() => (window as unknown as { testVoxelDraws: number; }).testVoxelDraws)
		).toBeGreaterThan(beforeGlobe);
		await page.getByText('ベースマップ', { exact: true }).locator('..').getByRole('button')
			.click();
		await expect(page.getByText('ベースマップ', { exact: true })).toBeHidden();
		// 地球儀への投影切り替えアニメーション後も描画されることを確認する。
		await page.waitForTimeout(1000);
		if (mode === 'volume') {
			await page.evaluate(() => {
				const target = window as unknown as {
					testVolumeCapture: number;
					testVolumePixels: number;
				};
				target.testVolumeCapture = 2;
				target.testVolumePixels = 0;
			});
			await settings.locator('input[type="range"]').nth(2).fill('4.1');
			await expect.poll(() =>
				page.evaluate(() =>
					(window as unknown as { testVolumePixels: number; }).testVolumePixels
				)
			).toBeGreaterThan(100);
		}
		await page.screenshot({ path: testInfo.outputPath(`${mode}-globe.png`) });
		expect(errors).toEqual([]);
	});
}
