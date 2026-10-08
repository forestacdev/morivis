import { readFileSync } from 'node:fs';
import {
	dmText,
	elementRecords,
	encode,
	outerRing
} from '../src/routes/map/utils/formats/dm/__fixtures__/records';
import { jwwFixture } from '../src/routes/map/utils/formats/jww/__fixtures__/builder';
import { expect, type Page, test } from './map-test';

const labels = ['ポイント', 'ライン', 'ポリゴン'];
const fixtures = [
	{
		format: 'JWW',
		name: 'test-drawing.jww',
		entryName: 'test-drawing',
		button: '位置を設定して登録',
		bytes: new Uint8Array(jwwFixture({
			scales: [1000],
			entities: [
				{ kind: 'Sen', values: [0, 0, 20, 10] },
				{ kind: 'Moji', values: [1, 2, 3, 2], text: 'test-text' },
				{ kind: 'Solid', values: [0, 0, 0, 2, 3, 0, 3, 2], penColor: 10, color: 0xccbbaa }
			]
		}))
	},
	{
		format: 'DM',
		name: 'test-drawing.dm',
		entryName: '試験図郭',
		button: '決定',
		bytes: new Uint8Array(encode(dmText(
			elementRecords(outerRing),
			elementRecords([[0, 0], [1000, 1000]], { type: '2', elementId: 2 }),
			elementRecords([[500, 500]], { type: '5', elementId: 3 })
		)))
	},
	{
		format: 'SXF',
		name: 'test-drawing.sfc',
		entryName: 'test-drawing',
		button: '決定',
		bytes: readFileSync(
			new URL(
				'../src/routes/map/utils/formats/sxf/sfc/__fixtures__/simple.sfc',
				import.meta.url
			)
		)
	}
];

const drop = async (page: Page, fixture: typeof fixtures[number]) => {
	const surface = page.locator('canvas.maplibregl-canvas:visible').first();
	await expect.poll(() =>
		surface.evaluate(canvas => {
			const b = canvas.getBoundingClientRect();
			return !!document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest(
				'[role="region"]'
			);
		})
	).toBe(true);
	await surface.evaluate((canvas, file) => {
		const transfer = new DataTransfer();
		transfer.items.add(new File([new Uint8Array(file.bytes)], file.name));
		const b = canvas.getBoundingClientRect();
		const target = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
			?? canvas;
		target.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
	}, { name: fixture.name, bytes: [...fixture.bytes] });
	for (const name of labels) {
		await expect(page.getByRole('checkbox', { name, exact: true })).toBeChecked();
	}
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

for (const fixture of fixtures) {
	for (const placement of ['zone', 'georef']) {
		test(`${fixture.format}: 3種類を${placement}でまとめて配置・登録し、再ドロップできる`, async ({ page }) => {
			const errors: string[] = [];
			page.on('pageerror', error => errors.push(error.stack ?? error.message));
			await drop(page, fixture);
			await page.getByRole('button', { name: fixture.button, exact: true }).click();
			await expect(page.getByText('投影法選択', { exact: true }).first()).toBeVisible();
			if (placement === 'georef') {
				await page.getByRole('button', { name: '位置合わせ', exact: true }).click();
			}
			await page.getByRole('button', { name: '決定', exact: true }).last().click();
			await expect(page.getByText('3レイヤーをまとめて追加しますか？', { exact: true }))
				.toBeVisible();
			for (const label of labels) {
				await expect(
					page.getByRole('button', {
						name: `${fixture.entryName}／${label}`,
						exact: true
					})
				).toBeVisible();
			}
			await page.getByRole('button', { name: '地図に追加', exact: true }).click();
			for (const label of labels) {
				await expect(
					page.getByRole('button', { name: 'レイヤー', exact: true }).filter({
						hasText: `${fixture.entryName}／${label}`
					})
				).toHaveCount(1);
			}
			await drop(page, fixture);
			expect(errors).toEqual([]);
		});
	}

	test(`${fixture.format}: 空選択を拒否し、選択した2種類のみプレビューする`, async ({ page }) => {
		await drop(page, fixture);
		for (const name of labels) {
			await page.getByRole('checkbox', { name, exact: true }).uncheck();
		}
		await expect(page.getByRole('button', { name: fixture.button, exact: true }))
			.toBeDisabled();
		for (const name of ['ポイント', 'ライン']) {
			await page.getByRole('checkbox', { name, exact: true }).check();
		}
		await page.getByRole('button', { name: fixture.button, exact: true }).click();
		await expect(page.getByText('投影法選択', { exact: true }).first()).toBeVisible();
		await page.getByRole('button', { name: '決定', exact: true }).last().click();
		await expect(page.getByText('2レイヤーをまとめて追加しますか？', { exact: true }))
			.toBeVisible();
		await expect(
			page.getByRole('button', { name: `${fixture.entryName}／ポリゴン`, exact: true })
		).toHaveCount(0);
		await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
		await expect(
			page.getByRole('button', { name: 'レイヤー', exact: true }).filter({
				hasText: fixture.entryName
			})
		).toHaveCount(0);
		await drop(page, fixture);
	});

	test(`${fixture.format}: 元レイヤー・クラスの選択を保ち、1種類なら単体登録する`, async ({ page }) => {
		await drop(page, fixture);
		const sourceLabels = page.locator('label').filter({
			has: page.locator('input[type="checkbox"]')
		});
		for (const label of await sourceLabels.all()) {
			if (!labels.includes((await label.innerText()).trim())) await label.click();
		}
		await expect(page.getByRole('button', { name: fixture.button, exact: true }))
			.toBeDisabled();
		for (const name of labels) {
			await page.getByRole('checkbox', { name, exact: true }).uncheck();
		}
		for (const name of labels) await page.getByRole('checkbox', { name, exact: true }).check();
		await expect(page.getByRole('button', { name: fixture.button, exact: true }))
			.toBeDisabled();
		for (const label of await sourceLabels.all()) {
			if (labels.includes((await label.innerText()).trim())) continue;
			await expect(label.locator('input')).not.toBeChecked();
			await label.click();
		}
		await page.getByRole('checkbox', { name: 'ポイント', exact: true }).uncheck();
		await page.getByRole('checkbox', { name: 'ポリゴン', exact: true }).uncheck();
		await page.getByRole('button', { name: fixture.button, exact: true }).click();
		await expect(page.getByText('投影法選択', { exact: true }).first()).toBeVisible();
		await page.getByRole('button', { name: '決定', exact: true }).last().click();
		await page.getByRole('button', { name: '地図に追加', exact: true }).click();
		await expect(
			page.getByRole('button', { name: 'レイヤー', exact: true }).filter({
				hasText: fixture.entryName
			})
		).toHaveCount(1);
	});
}
