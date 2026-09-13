import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeGeoidPixel, fetchGeoidHeight, getGeoidTilePosition } from './geoid';

afterEach(() => vi.unstubAllGlobals());

describe('ジオイド高の数値PNG', () => {
	it('通常のDEMの1/100の単位で正負の値を読み取る', () => {
		expect(decodeGeoidPixel([0, 39, 16, 255])).toBe(1);
		expect(decodeGeoidPixel([255, 216, 240, 255])).toBe(-1);
		expect(decodeGeoidPixel([0, 0, 0, 255])).toBe(0);
	});
	it('透明・欠損値を高さ0として扱わない', () => {
		expect(decodeGeoidPixel([0, 0, 0, 0])).toBeNull();
		expect(decodeGeoidPixel([128, 0, 0, 255])).toBeNull();
	});
	it('提供範囲外と不正な座標を拒否する', () => {
		for (const [lng, lat] of [[0, 0], [NaN, 30], [130, Infinity]]) {
			expect(() => getGeoidTilePosition(lng, lat)).toThrow('提供範囲外');
		}
	});
	it('Web Mercatorのピクセル位置とz/y/xのURLを使う', () => {
		const { url, x, y } = getGeoidTilePosition(135, 30);
		expect(url).toBe('https://tiles.gsj.jp/tiles/elev/gsigeoid/8/105/224.png');
		expect(x).toBe(0);
		expect(y).toBe(
			Math.floor((1 - Math.asinh(Math.tan(Math.PI / 6)) / Math.PI) / 2 * 65536) % 256
		);
	});
	it('取得画像の画素を読み、画像リソースを解放する', async () => {
		const close = vi.fn();
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Blob())));
		vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ close }));
		const getImageData = vi.fn().mockReturnValue({ data: [0, 39, 16, 255] });
		vi.stubGlobal(
			'OffscreenCanvas',
			class {
				getContext = () => ({ drawImage: vi.fn(), getImageData });
			}
		);
		expect(await fetchGeoidHeight(135, 30)).toBe(1);
		expect(close).toHaveBeenCalledOnce();
		const { x, y } = getGeoidTilePosition(135, 30);
		expect(getImageData).toHaveBeenCalledWith(x, y, 1, 1);
	});
	it('HTTPエラーを補正値に変換しない', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
		await expect(fetchGeoidHeight(135, 30)).rejects.toThrow('404');
	});
});
