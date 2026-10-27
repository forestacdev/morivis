import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPixelColor } from './tile-query';

vi.mock('$routes/map/utils/platform/request', () => ({
	resolveRequestUrl: (url: string) => url
}));

const getImageData = vi.fn();
const drawImage = vi.fn();
const loads: { url: string; crossOrigin: string; }[] = [];
let failImage = false;

beforeEach(() => {
	getImageData.mockReturnValue({ data: new Uint8ClampedArray([128, 100, 128, 255]) });
	vi.stubGlobal('document', {
		createElement: () => ({ getContext: () => ({ getImageData, drawImage }) })
	});
	vi.stubGlobal(
		'Image',
		class {
			width = 512;
			height = 512;
			crossOrigin = '';
			onload: (() => void) | null = null;
			onerror: ((event: Event) => void) | null = null;
			set src(url: string) {
				loads.push({ url, crossOrigin: this.crossOrigin });
				// srcの設定時点でコールバックとCORS設定が必要。
				if (failImage) this.onerror?.(new Event('error'));
				else this.onload?.();
			}
		}
	);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	loads.length = 0;
	failImage = false;
});

const url = 'https://test.invalid/{z}/{x}/{y}.webp';

describe('タイルからのピクセル取得', () => {
	it('メルカトル投影で求めたピクセルを読み取る', async () => {
		// z2のタイル(2, 1)内の任意の画素中心を逆投影する。
		const worldX = 2 + 123.5 / 512;
		const worldY = 1 + 234.5 / 512;
		const lng = worldX / 4 * 360 - 180;
		const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * worldY / 4))) * 180 / Math.PI;
		expect(await getPixelColor(url, { lng, lat }, 2, 512, 'image')).toBe('#806480');
		expect(getImageData).toHaveBeenCalledWith(123, 234, 1, 1);
		expect(loads).toEqual([{
			url: 'https://test.invalid/2/2/1.webp',
			crossOrigin: 'anonymous'
		}]);
	});

	it.each([0, 360, -360])('周回した経度%sでも同じ画素を読む', async (lng) => {
		await getPixelColor(url, { lng, lat: 0 }, 2, 512, 'image');
		expect(loads[0].url).toBe('https://test.invalid/2/2/2.webp');
		expect(getImageData).toHaveBeenCalledWith(0, 0, 1, 1);
	});

	it.each([85.0511287798066, -85.0511287798066])(
		'緯度境界%sで画素範囲を超えない',
		async (lat) => {
			await getPixelColor(url, { lng: 0, lat }, 2, 512, 'image');
			const y = getImageData.mock.calls[0][1];
			expect(y).toBe(lat > 0 ? 0 : 511);
		}
	);

	it.each([{ lng: NaN, lat: 0 }, { lng: 0, lat: 90 }])(
		'無効な座標では画像を取得しない',
		async (lngLat) => {
			expect(await getPixelColor(url, lngLat, 2, 512, 'image')).toBeNull();
			expect(loads).toHaveLength(0);
		}
	);

	it('透明な画素は欠損として返す', async () => {
		getImageData.mockReturnValue({ data: new Uint8ClampedArray([0, 0, 0, 0]) });
		expect(await getPixelColor(url, { lng: 0, lat: 0 }, 2, 512, 'image')).toBeNull();
	});

	it('画像の取得失敗は欠損として返す', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		failImage = true;
		expect(await getPixelColor(url, { lng: 0, lat: 0 }, 2, 512, 'image')).toBeNull();
	});
});
