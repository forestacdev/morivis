import {
	chunkFixture,
	regionFixture
} from '../src/routes/map/utils/formats/mca/__fixtures__/region';
import { expect, test } from './map-test';

test('MCAの地表画像を表示し、拡大・選択とファイル差し替えを反映する', async ({ page }) => {
	await page.goto('map', { waitUntil: 'domcontentloaded' });
	const gridFile = 'r.0.0.mca';
	const bytes = [
		...new Uint8Array(regionFixture([{
			nbt: chunkFixture({ palette: ['minecraft:water'] })
		}]))
	];
	await page.locator('canvas.maplibregl-canvas:visible').first().evaluate(
		(canvas, { bytes, gridFile }) => {
			const transfer = new DataTransfer();
			transfer.items.add(new File([new Uint8Array(bytes)], gridFile));
			canvas.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
		},
		{ bytes, gridFile }
	);
	const tile = page.getByRole('button', { name: gridFile, exact: true, pressed: true });
	const image = tile.locator('img');
	await expect(image).toHaveJSProperty('naturalWidth', 512);
	await expect(image).toHaveJSProperty('naturalHeight', 512);
	const source = await image.getAttribute('src');
	await page.getByRole('button', { name: '拡大', exact: true }).click();
	await expect(page.getByRole('list', { name: '3列3行のリージョン一覧' })).toBeVisible();
	await tile.click();
	const excluded = page.getByRole('button', { name: gridFile, exact: true, pressed: false });
	await expect(excluded.locator('img')).toHaveAttribute('src', source!);
	await expect(page.getByRole('button', { name: '読み込む', exact: true })).toBeDisabled();
	await page.getByLabel('地形リージョンを追加（.mca）').setInputFiles({
		name: gridFile,
		mimeType: 'application/octet-stream',
		buffer: Buffer.from('test-invalid')
	});
	await expect(tile).toContainText('画像なし');
	await expect(tile.locator('img')).toHaveCount(0);
});
