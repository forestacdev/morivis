import { getPixelColor } from '$routes/map/utils/raster/tile-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMapterhornElevation } from './mapterhorn';

vi.mock('$routes/map/utils/raster/tile-query', () => ({ getPixelColor: vi.fn() }));

afterEach(() => vi.resetAllMocks());

describe('Mapterhornの標高取得', () => {
	it.each([
		['#800000', 0],
		['#806480', 100.5],
		['#7fff00', -1],
		['#800001', 1 / 256]
	])('Terrarium色 %s を %s mとして復号する', async (color, expected) => {
		vi.mocked(getPixelColor).mockResolvedValue(color);
		expect(await getMapterhornElevation(0, 0)).toBe(expected);
		expect(getPixelColor).toHaveBeenCalledTimes(1);
	});

	it('欠損した詳細タイルから親タイルへ切り替える', async () => {
		vi.mocked(getPixelColor)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce('#800100');
		expect(await getMapterhornElevation(0, 0)).toBe(1);
		expect(vi.mocked(getPixelColor).mock.calls.map((call) => call[2])).toEqual([16, 15, 14]);
	});

	it('全世界タイルでも取得できなければ0ではなくnullを返す', async () => {
		vi.mocked(getPixelColor).mockResolvedValue(null);
		expect(await getMapterhornElevation(0, 0)).toBeNull();
		expect(vi.mocked(getPixelColor).mock.calls.map((call) => call[2])).toEqual([
			16,
			15,
			14,
			13,
			12
		]);
	});
});
