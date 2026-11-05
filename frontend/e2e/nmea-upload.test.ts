import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const dropFixture = async (page: Page, name: string | string[], invalid = false) => {
	const files = (Array.isArray(name) ? name : [name]).map(name => ({
		name,
		bytes: [
			...readFileSync(
				new URL(
					`../src/routes/map/utils/formats/nmea/__fixtures__/${name}`,
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
					[input.invalid ? 'test-invalid-nmea' : new Uint8Array(file.bytes)],
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

test('軌跡を登録した後の2回目のドロップで計測点も登録できる', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await dropFixture(page, 'test-track.nmea');
	await expect(page.getByLabel('NMEAファイル', { exact: true })).toBeHidden();
	await expect(page.getByText('選択済み: 1ファイル', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'ライン', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'ポイント', exact: true })).toBeVisible();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-track', { exact: true }).first()).toBeVisible();
	await dropFixture(page, 'test-track.nmea');
	await page.getByRole('button', { name: 'ポイント', exact: true }).click();
	await page.getByLabel('データ名').fill('test-points');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-points', { exact: true }).first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('不正な入力を選び直し、同じファイルを再選択できる', async ({ page }) => {
	await dropFixture(page, 'test-track.nmea', true);
	await expect(page.getByRole('alert')).toContainText('有効な位置情報がありません');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
	const input = page.getByLabel('NMEAファイル', { exact: true });
	const file = {
		name: 'test-track.log',
		mimeType: 'text/plain',
		buffer: readFileSync(
			new URL(
				'../src/routes/map/utils/formats/nmea/__fixtures__/test-track.nmea',
				import.meta.url
			)
		)
	};
	await input.setInputFiles(file);
	await expect(page.getByRole('button', { name: 'ライン', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'ポイント', exact: true })).toBeVisible();
	await page.getByLabel('データ名').fill('test-edited');
	await input.setInputFiles(file);
	await expect(page.getByLabel('データ名')).toHaveValue('test-track');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
});

test('複数ログは結合せず選択したファイルのみ表示する', async ({ page }) => {
	await dropFixture(page, ['test-track.nmea', 'test-single.nmea']);
	await expect(page.getByLabel('読み込むファイル')).toBeVisible();
	await page.getByLabel('読み込むファイル').selectOption('1');
	await expect(page.getByText('軌跡: 0件 / 計測点: 1件')).toBeVisible();
	await expect(page.getByText('読み込みタイプ: ポイント', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await dropFixture(page, 'test-track.nmea');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
});

test('時間フィルターのモードだけを変更しても再表示時に保持する', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await dropFixture(page, 'test-track.nmea');
	await page.getByRole('button', { name: 'ポイント', exact: true }).click();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	const openStyle = async (expand = false) => {
		const layer = page.getByRole('button', { name: 'レイヤー', exact: true }).filter({
			hasText: 'test-track'
		});
		await layer.hover();
		await layer.locator('button').last().click();
		if (expand) await page.getByText('時間フィルター', { exact: true }).click();
	};
	await openStyle(true);
	const enabled = page.getByLabel('時間フィルターを有効化', { exact: true });
	if (!await enabled.isChecked()) {
		await page.getByText('時間フィルターを有効化', { exact: true }).click();
	}
	// 開始・終了が同じ状態にしてからmodeだけを切り替える。
	await page.getByRole('slider', { name: '上限値', exact: true }).fill('0');
	await page.getByText('開始時刻のみで絞る', { exact: true }).click();
	await expect(page.getByLabel('開始時刻のみで絞る', { exact: true })).toBeChecked();
	await page.getByTitle('スタイルをリセット', { exact: true }).locator('..').locator('button')
		.last().click();
	await expect(page.getByText('時間フィルター', { exact: true })).toBeHidden();
	await openStyle();
	await expect(page.getByLabel('開始時刻のみで絞る', { exact: true })).toBeChecked();
	await page.getByText('カメラ追跡', { exact: true }).click();
	await page.getByRole('button', { name: 'ルート', exact: true }).click();
	await expect(page.getByRole('button', { name: 'ルート', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	expect(errors).toEqual([]);
});
