import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeResourceTexture } from './texture';

afterEach(() => vi.unstubAllGlobals());
const decoder = (width: number, height: number) => {
	const bitmap = { width, height, close: vi.fn() };
	const draw = vi.fn();
	const encode = vi.fn(async () => new Blob(['test-cropped']));
	vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
	vi.stubGlobal(
		'OffscreenCanvas',
		class {
			getContext = () => ({
				drawImage: draw,
				getImageData: () => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) })
			});
			convertToBlob = encode;
		}
	);
	return { bitmap, draw, encode };
};
describe('Minecraft画像のフレーム選択', () => {
	it('非アニメーションの長方形画像を切り詰めない', async () => {
		const { bitmap, draw, encode } = decoder(16, 32);
		const blob = new Blob(['test-original']);
		const result = await decodeResourceTexture('test:wide', blob);
		expect(draw).toHaveBeenCalledWith(bitmap, 0, 0, 16, 32, 0, 0, 16, 32);
		expect(encode).not.toHaveBeenCalled();
		expect(new TextDecoder().decode(result.png)).toBe('test-original');
		expect(bitmap.close).toHaveBeenCalledOnce();
	});
	it.each([[16, 32, 0, 16], [32, 16, 16, 0]])(
		'指定した先頭フレームを切り出す（%i×%i）',
		async (width, height, x, y) => {
			const { bitmap, draw, encode } = decoder(width, height);
			const result = await decodeResourceTexture(
				'test:animation',
				new Blob(['test-original']),
				{ frames: [{ index: 1 }, 0] }
			);
			expect(draw).toHaveBeenCalledWith(bitmap, x, y, 16, 16, 0, 0, 16, 16);
			expect(encode).toHaveBeenCalledOnce();
			expect(new TextDecoder().decode(result.png)).toBe('test-cropped');
		}
	);
	it('存在しないフレームを拒否し、展開画像を解放する', async () => {
		const { bitmap } = decoder(16, 32);
		await expect(decodeResourceTexture('test:invalid', new Blob(), { frames: [5] })).rejects
			.toThrow('寸法');
		expect(bitmap.close).toHaveBeenCalledOnce();
	});
});
