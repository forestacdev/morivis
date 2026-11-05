import {
	chunkFixture,
	regionFixture
} from '../src/routes/map/utils/formats/mca/__fixtures__/region';
import { expect, test } from './map-test';

test('負座標のMCAをプレビュー地図で拡大・選択し、差し替えを反映する', async ({ page }) => {
	await page.goto('map', { waitUntil: 'domcontentloaded' });
	const name = 'r.-1.-1.mca';
	const bytes = [
		...new Uint8Array(regionFixture([{
			index: 16 * 32 + 16,
			nbt: chunkFixture({ x: -16, z: -16, palette: ['minecraft:water'] })
		}]))
	];
	await page.locator('canvas.maplibregl-canvas:visible').first().evaluate(
		(canvas, { bytes, name }) => {
			const transfer = new DataTransfer();
			transfer.items.add(new File([new Uint8Array(bytes)], name));
			canvas.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
		},
		{ bytes, name }
	);
	const preview = page.getByRole('region', { name: 'リージョン配置図' });
	const canvas = preview.locator('canvas');
	await expect(canvas).toBeVisible();
	const waterPixels = async () => {
		const png = (await canvas.screenshot()).toString('base64');
		return page.evaluate(async png => {
			const image = new Image();
			image.src = 'data:image/png;base64,' + png;
			await image.decode();
			const target = document.createElement('canvas');
			target.width = image.width;
			target.height = image.height;
			const ctx = target.getContext('2d')!;
			ctx.drawImage(image, 0, 0);
			const { data } = ctx.getImageData(0, 0, image.width, image.height);
			let count = 0;
			for (let i = 0; i < data.length; i += 4) {
				if (data[i] === 63 && data[i + 1] === 118 && data[i + 2] === 196) count++;
			}
			return count;
		}, png);
	};
	await expect.poll(waterPixels).toBeGreaterThan(0);
	const initial = await waterPixels();
	await preview.getByRole('button', { name: '拡大' }).click();
	await expect.poll(waterPixels).toBeGreaterThan(initial * 2);
	await canvas.click();
	await expect(page.getByRole('checkbox', { name: name + 'を読み込み対象にする' })).not
		.toBeChecked();
	await expect(page.getByRole('button', { name: '読み込む', exact: true })).toBeDisabled();
	await page.getByLabel('地形リージョンを追加（.mca）').setInputFiles({
		name,
		mimeType: 'application/octet-stream',
		buffer: Buffer.from('test-invalid')
	});
	await expect(preview.getByRole('status')).toContainText(name + ' の画像なし');
	await expect.poll(waterPixels).toBe(0);
	await expect(page.getByRole('checkbox', { name: name + 'を読み込み対象にする' })).toBeChecked();
});
