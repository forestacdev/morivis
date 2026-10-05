import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const dropFixture = async (page: Page, name: string | string[], invalid = false) => {
	const files = (Array.isArray(name) ? name : [name]).map(name => ({
		name,
		bytes: [
			...readFileSync(
				new URL(
					`../src/routes/map/utils/formats/dwg/__fixtures__/${name}`,
					import.meta.url
				)
			)
		]
	}));
	const surface = page.locator('canvas.maplibregl-canvas:visible').first();
	// 解析が終わっても短時間残るProcessingの退場アニメーションを待つ。
	await expect.poll(() =>
		surface.evaluate(canvas => {
			const bounds = canvas.getBoundingClientRect();
			return !!document.elementFromPoint(
				bounds.left + bounds.width / 2,
				bounds.top + bounds.height / 2
			)?.closest('[role="region"]');
		})
	).toBe(true);
	await surface.evaluate((canvas, input) => {
		const transfer = new DataTransfer();
		for (const file of input.files) {
			transfer.items.add(
				new File(
					[input.invalid ? 'test-invalid-dwg' : new Uint8Array(file.bytes)],
					file.name
				)
			);
		}
		const bounds = canvas.getBoundingClientRect();
		const target = document.elementFromPoint(
			bounds.left + bounds.width / 2,
			bounds.top + bounds.height / 2
		) ?? canvas;
		target.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
	}, { files, invalid });
};

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
	await page.goto('map?c=2.500000_1.250000&z=14&p=0&b=0', { waitUntil: 'domcontentloaded' });
	await page.locator('canvas.maplibregl-canvas:visible').first().waitFor();
});

for (const extension of ['dwg', 'dxf']) {
	test(`${extension}の3D面をモデル配置から地図へ追加し、再ドロップできる`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', error => errors.push(error.message));
		await dropFixture(page, `test-mesh.${extension}`);
		await expect(page.getByText(`${extension.toUpperCase()}ファイルの登録`, { exact: true }))
			.toBeVisible();
		await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
		await expect(page.getByLabel('読み込み方式')).toHaveValue('auto');
		await expect(page.getByLabel('test-face', { exact: true })).toBeChecked();
		await page.getByLabel('図面の単位').selectOption('m');
		await expect(page.getByText('読み込む範囲（X × Y）：20 × 10 m', { exact: true }))
			.toBeVisible();
		await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
		await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
		await expect(
			page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true })
		).toBeAttached();
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText('test-mesh', { exact: true }).first()).toBeVisible();
		await dropFixture(page, `test-mesh.${extension}`);
		await expect(page.getByLabel('図面の単位')).toHaveValue('auto');
		await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
		await page.getByLabel('読み込み方式').selectOption('2d-line');
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await expect(page.getByText('投影法選択', { exact: true }).first()).toBeVisible();
		expect(errors).toEqual([]);
	});
}

test('不正なDWGのエラー後にキャンセルして再読込できる', async ({ page }) => {
	await dropFixture(page, 'test-mesh.dwg', true);
	await expect(page.getByRole('button', { name: '決定', exact: true })).toBeDisabled();
	await expect(page.getByLabel('図面の単位')).toBeEnabled();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await dropFixture(page, 'test-mesh.dwg');
	await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
	await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true })).toBeEnabled();
});

for (const encoding of ['sat', 'sab']) {
	test(`ACIS ${encoding}のソリッドを選択して地図へ登録する`, async ({ page }, testInfo) => {
		await dropFixture(page, `test-solids-${encoding}.dwg`);
		await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
		await expect(page.getByText('3DSOLID', { exact: true })).toBeVisible();
		await expect(page.getByLabel('test-box', { exact: true })).toBeChecked();
		await expect(page.getByLabel('test-cylinder', { exact: true })).toBeChecked();
		await expect(page.getByLabel('test-sphere', { exact: true })).toBeChecked();
		if (encoding === 'sab') {
			await page.screenshot({ path: testInfo.outputPath('test-acis-form.png') });
		}
		await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
		await expect(
			page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true })
		).toBeAttached();
		if (encoding === 'sab') {
			await page.getByRole('button', { name: '決定', exact: true }).click({ trial: true });
			await page.screenshot({ path: testInfo.outputPath('test-acis-placement.png') });
		}
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText(`test-solids-${encoding}`, { exact: true }).first())
			.toBeVisible();
	});
}

test('全てのACIS部品が未対応なら対象を表示し登録を止める', async ({ page }) => {
	await dropFixture(page, 'test-unsupported-solid.dwg');
	await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
	await expect(page.getByText(/未対応または不正なACIS形状/)).toBeVisible();
	await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }))
		.toBeDisabled();
});

test(
	'未対応部品を明示して残りを登録し、次のファイルでは除外一覧をリセットする',
	async ({ page }, testInfo) => {
		await dropFixture(page, 'test-partial-solids.dwg');
		await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
		await expect(page.getByRole('region', { name: '変換できない部品', exact: true }))
			.toHaveCount(0);
		await expect(page.getByLabel('test-excluded', { exact: true })).toBeChecked();
		await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
		const excluded = page.getByRole('region', { name: '変換できない部品', exact: true });
		await expect(excluded).toContainText('変換できない1部品を除外しました');
		await expect(excluded).toContainText('test-excluded / 3DSOLID / ID:');
		await expect(excluded).toContainText('未対応または不正なACIS形状');
		await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
		await expect(page.getByLabel('test-valid', { exact: true })).toBeChecked();
		await expect(page.getByLabel('test-excluded', { exact: true })).toBeChecked();
		await page.screenshot({ path: testInfo.outputPath('test-partial-form.png') });
		await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
		await expect(
			page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true })
		).toBeAttached();
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText('test-partial-solids', { exact: true }).first()).toBeVisible();
		await dropFixture(page, 'test-trimmed-solid.dwg');
		await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }))
			.toBeEnabled();
		await expect(excluded).toHaveCount(0);
	}
);

test('DWGの変換待ちでも既存のキャンセルを押せて再読込できる', async ({ page }) => {
	let release = () => {};
	const pending = new Promise<void>(resolve => {
		release = resolve;
	});
	const wasmUrl = '**/vendor/dwg-acis/dwg_acis_bg.wasm';
	await page.route(wasmUrl, async route => {
		await pending;
		// キャンセル済みWorkerのリクエストは中断されている場合がある。
		await route.continue().catch(() => {});
	});
	try {
		await dropFixture(page, 'test-mesh.dwg');
		await expect(
			page.getByRole('status').filter({ hasText: 'DWGの図形・レイヤーを読み取っています' })
		)
			.toBeVisible();
		await expect(page.getByRole('button', { name: '決定', exact: true })).toBeDisabled();
		await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
		await expect(page.getByText('DWGファイルの登録', { exact: true })).toHaveCount(0);
	} finally {
		release();
		await page.unroute(wasmUrl);
	}
	await dropFixture(page, 'test-mesh.dwg');
	await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
	await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true })).toBeEnabled();
});

test('バイナリで読み込んだACISソリッドを2D輪郭線にして座標選択へ進める', async ({ page }) => {
	await dropFixture(page, 'test-trimmed-solid.dwg');
	await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true })).toBeEnabled();
	await page.getByLabel('読み込み方式').selectOption('2d-line');
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await expect(page.getByText('投影法選択', { exact: true }).first()).toBeVisible();
});

// Workerへの要求を記録し、確認操作より前に重い変換を開始していないことを検証する。
const trackDwgRequests = async (page: Page, stallConversion = false) => {
	await page.evaluate((stall) => {
		const state = window as unknown as {
			cadRequests: { mode: string; layers?: string[]; }[];
			cadTerminated: number;
		};
		state.cadRequests = [];
		state.cadTerminated = 0;
		const OriginalWorker = window.Worker;
		window.Worker = class extends OriginalWorker {
			postMessage(...args: Parameters<Worker['postMessage']>) {
				const options = args[0]?.options;
				if (options) {
					state.cadRequests.push(structuredClone(options));
					if (stall && options.mode === 'convert') return;
				}
				Reflect.apply(OriginalWorker.prototype.postMessage, this, args);
			}
			terminate() {
				state.cadTerminated++;
				super.terminate();
			}
		};
	}, stallConversion);
};
const dwgRequests = (page: Page) =>
	page.evaluate(() =>
		(window as unknown as { cadRequests: { mode: string; layers?: string[]; }[]; }).cadRequests
	);

test('選択前と単位変更時は一覧取得だけを行い、2D線ではソリッドを変換しない', async ({ page }) => {
	await trackDwgRequests(page);
	await dropFixture(page, 'test-partial-solids.dwg');
	await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
	await page.getByText('test-excluded', { exact: true }).click();
	await page.getByLabel('図面の単位').selectOption('m');
	await expect(page.getByLabel('test-excluded', { exact: true })).not.toBeChecked();
	expect(await dwgRequests(page)).toEqual([{ mode: 'inspect' }]);
	await page.getByRole('button', { name: 'ライン', exact: true }).click();
	await page.getByLabel('読み込み方式').selectOption('2d');
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await expect(page.getByText('投影法選択', { exact: true }).first()).toBeVisible();
	expect(await dwgRequests(page)).toEqual([{ mode: 'inspect' }]);
});

test('決定時だけ選択したソリッドを変換する', async ({ page }) => {
	await trackDwgRequests(page);
	await dropFixture(page, 'test-partial-solids.dwg');
	await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
	await page.getByText('test-excluded', { exact: true }).click();
	expect(await dwgRequests(page)).toEqual([{ mode: 'inspect' }]);
	await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
	await expect(page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true }))
		.toBeAttached();
	expect(await dwgRequests(page)).toEqual([{ mode: 'inspect' }, {
		mode: 'convert',
		layers: ['test-valid']
	}]);
});

test('決定後のソリッド変換をキャンセルして再読込できる', async ({ page }) => {
	await trackDwgRequests(page, true);
	await dropFixture(page, 'test-trimmed-solid.dwg');
	await page.getByRole('button', { name: '3Dモデルの配置へ', exact: true }).click();
	await expect(page.getByRole('status').filter({ hasText: '選択した図形を変換しています' }))
		.toBeVisible();
	await expect(page.getByLabel('図面の単位')).toBeDisabled();
	await expect.poll(() => dwgRequests(page)).toEqual([{ mode: 'inspect' }, {
		mode: 'convert',
		layers: ['test-trim']
	}]);
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await expect(page.getByText('DWGファイルの登録', { exact: true })).toHaveCount(0);
	await expect.poll(() =>
		page.evaluate(() => (window as unknown as { cadTerminated: number; }).cadTerminated)
	).toBe(2);
	await dropFixture(page, 'test-mesh.dwg');
	await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
	await expect(page.getByRole('button', { name: '3Dモデルの配置へ', exact: true })).toBeEnabled();
});

for (const mode of ['auto', '2d-line']) {
	test(`GEODATAのあるCADは${mode}で座標選択・手動配置を省略する`, async ({ page }) => {
		await dropFixture(page, 'test-georeferenced.dxf');
		await expect(page.getByText('座標系: EPSG:3857（図面の設定から自動配置）', { exact: true }))
			.toBeVisible();
		await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
		await page.getByLabel('読み込み方式').selectOption(mode);
		await page.getByRole('button', { name: '決定', exact: true }).click();
		await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
		await expect(page.getByText('投影法選択', { exact: true })).toHaveCount(0);
		await expect(
			page.getByRole('button', { name: 'モデル範囲の頂点 min-min-min', exact: true })
		).toHaveCount(0);
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText('test-georeferenced', { exact: true }).first()).toBeVisible();
	});
}
