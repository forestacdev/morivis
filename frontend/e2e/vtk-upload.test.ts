import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const dropFixture = async (page: Page, name: string | string[], invalid = false) => {
	const files = (Array.isArray(name) ? name : [name]).map(name => ({
		name,
		bytes: [
			...readFileSync(
				new URL(`../src/routes/map/utils/formats/vtk/__fixtures__/${name}`, import.meta.url)
			)
		]
	}));
	await page.locator('canvas.maplibregl-canvas:visible').first().evaluate((canvas, input) => {
		const transfer = new DataTransfer();
		for (const file of input.files) {
			transfer.items.add(
				new File(
					[input.invalid ? 'test-invalid-vtk' : new Uint8Array(file.bytes)],
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

test('VTKを連続して地図へ追加し、次のドロップも解析できる', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await dropFixture(page, 'test-volumes.vtu');
	await expect(page.getByText('VTK', { exact: true })).toBeVisible();
	await expect(page.getByText(/表示する三角形 6 面/)).toBeVisible();
	await expect(page.getByRole('button', { name: '解析', exact: true })).toHaveCount(0);
	await page.getByLabel('色分けに使う解析値').selectOption('1');
	await expect(page.getByText('最小 10', { exact: true })).toBeVisible();
	await expect(page.getByText('最大 20', { exact: true })).toBeVisible();
	await page.getByLabel('座標の単位').selectOption('1');
	await page.getByRole('button', { name: '読み込み', exact: true }).click();
	await expect(page.getByRole('button', { name: '決定', exact: true })).toBeVisible({
		timeout: 30000
	});
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-volumes', { exact: true }).first()).toBeVisible();
	await expect(page.getByText('VTK', { exact: true })).toHaveCount(0);
	await dropFixture(page, 'test-surface.vtk');
	await expect(page.getByText(/表示する三角形 3 面/)).toBeVisible();
	await page.getByRole('button', { name: '読み込み', exact: true }).click();
	await page.getByRole('button', { name: '決定', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-surface', { exact: true }).first()).toBeVisible();
	await dropFixture(page, 'test-surface.vtk');
	await expect(page.getByText(/表示する三角形 3 面/)).toBeVisible();
	expect(errors).toEqual([]);
});

test('不正なVTKで理由を表示し、キャンセル後に別ファイルを解析できる', async ({ page }) => {
	await dropFixture(page, 'test-surface.vtk', true);
	await expect(page.getByRole('alert')).toContainText('ヘッダー');
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await dropFixture(page, 'test-surface.vtk');
	await expect(page.getByText(/表示する三角形 3 面/)).toBeVisible();
	await expect(page.getByText(/2 セルは表示対象から除外/)).toBeVisible();
});

for (
	const [name, triangles] of [['test-grid.vti', 20], ['test-grid.vtr', 4], ['test-grid.vts', 4], [
		'test-quadratic.vtu',
		16
	], ['test-pieces.vtu', 6]] as const
) {
	test(`${name}をWorkerで解析してモデル配置へ渡す`, async ({ page }) => {
		await dropFixture(page, name);
		await expect(page.getByText(`表示する三角形 ${triangles} 面`, { exact: false }))
			.toBeVisible();
		await page.getByLabel('色分けに使う解析値').selectOption('0');
		await page.getByRole('button', { name: '読み込み', exact: true }).click();
		await expect(page.getByRole('button', { name: '決定', exact: true })).toBeVisible({
			timeout: 30000
		});
	});
}

test('自動解析中のファイル切替とキャンセル後も選択したファイルの結果を表示する', async ({ page }) => {
	// 小さな架空fixtureでも処理中の操作を検証できるよう、Workerへの送信だけ遅らせる。
	await page.evaluate(() => {
		const OriginalWorker = window.Worker;
		window.Worker = class extends OriginalWorker {
			private timer: ReturnType<typeof setTimeout> | undefined;
			postMessage: Worker['postMessage'] = message => {
				this.timer = setTimeout(() => super.postMessage(message), 500);
			};
			terminate = () => {
				clearTimeout(this.timer);
				super.terminate();
			};
		};
	});
	await dropFixture(page, ['test-volumes.vtu', 'test-surface.vtk']);
	await expect(page.getByRole('status')).toContainText('VTKを解析しています');
	await page.getByLabel('読み込むファイル').selectOption('1');
	await expect(page.getByText(/表示する三角形 3 面/)).toBeVisible();
	await expect(page.getByText(/表示する三角形 6 面/)).toHaveCount(0);
	await page.getByLabel('読み込むファイル').selectOption('0');
	await expect(page.getByRole('status')).toContainText('VTKを解析しています');
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await expect(page.getByText('VTK', { exact: true })).toHaveCount(0);
	await dropFixture(page, 'test-volumes.vtu');
	await expect(page.getByText(/表示する三角形 6 面/)).toBeVisible();
});

test('VTK画面上へ2回目以降のファイルをドロップすると自動で再解析する', async ({ page }) => {
	await dropFixture(page, 'test-volumes.vtu');
	await expect(page.getByText(/表示する三角形 6 面/)).toBeVisible();
	await dropFixture(page, 'test-surface.vtk');
	await expect(page.getByText(/表示する三角形 3 面/)).toBeVisible();
	await dropFixture(page, 'test-surface.vtk', true);
	await expect(page.getByRole('alert')).toContainText('ヘッダー');
	await dropFixture(page, 'test-surface.vtk');
	await expect(page.getByText(/表示する三角形 3 面/)).toBeVisible();
});
