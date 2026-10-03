import { readFileSync } from 'node:fs';
import { expect, type Page, test } from './map-test';

const dropFixture = async (page: Page, name: string | string[], invalid = false) => {
	const files = (Array.isArray(name) ? name : [name]).map(name => ({
		name,
		bytes: [
			...readFileSync(
				new URL(
					`../src/routes/map/utils/formats/czml/__fixtures__/${name}`,
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
					[input.invalid ? 'test-invalid-czml' : new Uint8Array(file.bytes)],
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

test('時刻付きポイントを追加し、2回目のドロップで軌跡を登録できる', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await dropFixture(page, 'test-moving.czml');
	await expect(page.getByLabel('CZMLファイル', { exact: true })).toBeHidden();
	await expect(page.getByText('時刻: 3件', { exact: true })).toBeVisible();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-moving', { exact: true }).first()).toBeVisible();
	await dropFixture(page, 'test-moving.czml');
	await page.getByRole('button', { name: '軌跡', exact: true }).click();
	await page.getByLabel('データ名').fill('test-tracks');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-tracks', { exact: true }).first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('静的なラインとポリゴンを登録できる', async ({ page }) => {
	for (const type of ['ライン', 'ポリゴン']) {
		await dropFixture(page, 'test-static.czml');
		await page.getByRole('button', { name: type, exact: true }).click();
		await page.getByLabel('データ名').fill(`test-${type}`);
		await page.getByRole('button', { name: '登録', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText(`test-${type}`, { exact: true }).first()).toBeVisible();
	}
});

test('不正なファイルからJSONの再選択で復帰し、同じファイルも再選択できる', async ({ page }) => {
	await dropFixture(page, 'test-moving.czml', true);
	await expect(page.getByRole('alert')).toContainText('JSONを読み取れませんでした');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
	const file = {
		name: 'test-static.json',
		mimeType: 'application/json',
		buffer: readFileSync(
			new URL(
				'../src/routes/map/utils/formats/czml/__fixtures__/test-static.czml',
				import.meta.url
			)
		)
	};
	const input = page.getByLabel('CZMLファイル', { exact: true });
	await input.setInputFiles(file);
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
	await page.getByLabel('データ名').fill('test-edited');
	await input.setInputFiles(file);
	await expect(page.getByLabel('データ名')).toHaveValue('test-static');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
});

test('複数ファイルを切り替えてキャンセル後もドロップできる', async ({ page }) => {
	await dropFixture(page, ['test-moving.czml', 'test-static.czml']);
	await expect(page.getByText('時刻: 3件', { exact: true })).toBeVisible();
	await page.getByLabel('読み込むファイル').selectOption('1');
	await expect(page.getByText('時刻: 0件', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'ポリゴン', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await dropFixture(page, 'test-moving.czml');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
});

test('CZMLとglTFを一緒にドロップして3Dモデルを登録できる', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', error => errors.push(error.message));
	await dropFixture(page, ['test-models.czml', 'test-model.gltf']);
	await expect(page.getByRole('button', { name: '3Dモデル', exact: true })).toBeVisible();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-models', { exact: true }).first()).toBeVisible();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeHidden();
	const layer = page.getByRole('button', { name: 'レイヤー', exact: true }).filter({
		hasText: 'test-models'
	});
	await layer.hover();
	await layer.locator('button').last().click();
	await page.getByText('時間', { exact: true }).click();
	await expect(page.getByRole('button', { name: '次へ', exact: true })).toBeVisible();
	await page.getByRole('button', { name: '次へ', exact: true }).click();
	await expect(page.getByRole('button', { name: '前へ', exact: true })).toBeEnabled();
	await page.getByRole('button', { name: '前へ', exact: true }).click();
	await dropFixture(page, 'test-static.czml');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
	expect(errors).toEqual([]);
});

test('モデル不足を説明し、関連ファイルを選び直すと登録できる', async ({ page }) => {
	await dropFixture(page, 'test-models.czml');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('関連ファイルがありません');
	await page.getByLabel('CZMLファイル', { exact: true }).setInputFiles(
		['test-models.czml', 'test-model.gltf'].map(name => ({
			name,
			mimeType: 'application/json',
			buffer: readFileSync(
				new URL(
					`../src/routes/map/utils/formats/czml/__fixtures__/${name}`,
					import.meta.url
				)
			)
		}))
	);
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
});

const fixtureText = (name: string) =>
	readFileSync(
		new URL(
			`../src/routes/map/utils/formats/czml/__fixtures__/${name}`,
			import.meta.url
		),
		'utf8'
	);
const singlePointText = () =>
	JSON.stringify(JSON.parse(fixtureText('test-static.czml')).slice(0, 2));
const openTextInput = async (page: Page, fromMenu = false) => {
	if (fromMenu) {
		await page.getByRole('button', { name: 'データ一覧を見る', exact: true }).click();
		await page.getByRole('button', { name: 'アップロード', exact: true }).click();
		await page.getByRole('button', { name: '対応形式一覧', exact: true }).click();
		await page.getByRole('button', { name: /^CZML/ }).click();
	} else {
		await dropFixture(page, 'test-static.czml');
		await expect(page.getByRole('button', { name: 'ポリゴン', exact: true })).toBeVisible();
	}
	await page.getByRole('button', { name: 'テキスト', exact: true }).click();
	await expect(page.getByLabel('CZMLテキスト', { exact: true })).toBeVisible();
};

test('テキストは登録時に検証し、修正後は入力した名前で登録できる', async ({ page }) => {
	await openTextInput(page, true);
	const text = page.getByLabel('CZMLテキスト', { exact: true });
	const register = page.getByRole('button', { name: '登録', exact: true });
	await expect(register).toBeDisabled();
	await text.fill('test-invalid-json');
	await expect(page.getByRole('alert')).toHaveCount(0);
	await register.click();
	await expect(page.getByRole('alert')).toContainText('JSONを読み取れませんでした');
	await text.fill(singlePointText());
	await page.getByLabel('データ名', { exact: true }).fill('test-pasted-point');
	await register.click();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	await expect(page.getByText('test-pasted-point', { exact: true }).first()).toBeVisible();
	await dropFixture(page, 'test-static.czml');
	await expect(page.getByRole('button', { name: 'ポリゴン', exact: true })).toBeVisible();
});

test('複数種類のテキストは選択して登録し、モード切り替えでも入力を保つ', async ({ page }) => {
	await openTextInput(page);
	const input = fixtureText('test-static.czml');
	await page.getByLabel('CZMLテキスト', { exact: true }).fill(input);
	await page.getByLabel('データ名', { exact: true }).fill('test-pasted-line');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('button', { name: 'ライン', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: 'ファイル', exact: true }).click();
	await expect(page.getByRole('button', { name: 'ポリゴン', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'テキスト', exact: true }).click();
	await expect(page.getByLabel('CZMLテキスト', { exact: true })).toHaveValue(input);
	await expect(page.getByLabel('データ名', { exact: true })).toHaveValue('test-pasted-line');
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: 'ライン', exact: true }).click();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
});

test('解析後にテキストを編集すると古い図形を登録しない', async ({ page }) => {
	await openTextInput(page);
	const text = page.getByLabel('CZMLテキスト', { exact: true });
	await text.fill(fixtureText('test-static.czml'));
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: 'ポリゴン', exact: true }).click();
	await text.fill('test-invalid-revision');
	await expect(page.getByRole('button', { name: 'ポリゴン', exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('JSONを読み取れませんでした');
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toHaveCount(0);
	await text.fill(singlePointText());
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
});

test('テキストの相対モデル参照を説明し、絶対URLへ直して3D登録できる', async ({ page }) => {
	await page.route('https://test.invalid/test-model.gltf', route =>
		route.fulfill({
			contentType: 'model/gltf+json',
			headers: { 'access-control-allow-origin': '*' },
			body: fixtureText('test-model.gltf')
		}));
	await openTextInput(page);
	const text = page.getByLabel('CZMLテキスト', { exact: true });
	const packets = JSON.parse(fixtureText('test-models.czml'));
	await text.fill(JSON.stringify(packets));
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '3Dモデル', exact: true }).click();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('絶対URL');
	packets[1].model.gltf = 'https://test.invalid/test-model.gltf';
	await text.fill(JSON.stringify(packets));
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '3Dモデル', exact: true }).click();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await expect(page.getByRole('button', { name: '地図に追加', exact: true })).toBeVisible();
});

for (const mode of ['ファイル', 'テキスト']) {
	test(`INERTIAL座標を${mode}から読み込み、軌跡を登録できる`, async ({ page }) => {
		const assets: string[] = [];
		page.on('response', response => {
			if (response.url().includes('/vendor/cesium/Assets/IAU2006_XYS/')) {
				expect(response.status()).toBe(200);
				assets.push(response.url());
			}
		});
		if (mode === 'ファイル') {
			await dropFixture(page, 'test-inertial.czml');
		} else {
			await openTextInput(page, true);
			await page.getByLabel('CZMLテキスト', { exact: true }).fill(
				fixtureText('test-inertial.czml')
			);
			await page.getByRole('button', { name: '登録', exact: true }).click();
		}
		await expect(page.getByText('時刻: 3件', { exact: true })).toBeVisible();
		expect(assets.length).toBeGreaterThan(0);
		await page.getByRole('button', { name: '軌跡', exact: true }).click();
		await page.getByLabel('データ名', { exact: true }).fill('test-inertial-tracks');
		await page.getByRole('button', { name: '登録', exact: true }).click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(page.getByText('test-inertial-tracks', { exact: true }).first()).toBeVisible();
	});
}

test('INERTIALの3Dモデルを登録して時刻を切り替えられる', async ({ page }) => {
	await dropFixture(page, ['test-inertial.czml', 'test-model.gltf']);
	await expect(page.getByRole('button', { name: '3Dモデル', exact: true })).toBeVisible();
	await page.getByRole('button', { name: '登録', exact: true }).click();
	await page.getByRole('button', { name: '地図に追加', exact: true }).click();
	const layer = page.getByRole('button', { name: 'レイヤー', exact: true }).filter({
		hasText: 'test-inertial'
	});
	await layer.hover();
	await layer.locator('button').last().click();
	await page.getByText('時間', { exact: true }).click();
	await page.getByRole('button', { name: '次へ', exact: true }).click();
	await expect(page.getByRole('button', { name: '前へ', exact: true })).toBeEnabled();
	await page.getByRole('button', { name: '前へ', exact: true }).click();
});

test('INERTIAL変換表の取得失敗を表示し、再ドロップで復帰する', async ({ page }) => {
	const pattern = '**/vendor/cesium/Assets/IAU2006_XYS/*.json';
	await page.route(pattern, route => route.fulfill({ status: 503, body: 'test-unavailable' }));
	await dropFixture(page, 'test-inertial.czml');
	await expect(page.getByRole('alert')).toContainText('変換データを読み込めません');
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeDisabled();
	await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
	await page.unroute(pattern);
	await dropFixture(page, 'test-inertial.czml');
	await expect(page.getByText('時刻: 3件', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '登録', exact: true })).toBeEnabled();
});
