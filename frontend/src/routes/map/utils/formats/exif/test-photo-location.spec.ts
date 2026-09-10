import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('exifr', () => ({ gps: vi.fn(), parse: vi.fn(async () => ({})) }));

import { gps } from 'exifr';
import {
	GEO_PHOTO_ATTRIBUTE_FIELDS,
	GEO_PHOTO_ATTRIBUTE_KEYS,
	hasExifGps,
	parseGeoPhotos
} from '.';

const photo = (name: string) => new File(['test-photo'], name);

beforeEach(() => {
	vi.mocked(gps).mockReset();
	vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-photo');
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('写真の現在地補完', () => {
	it('属性表示に画像描画用URLを含めない', () => {
		expect(GEO_PHOTO_ATTRIBUTE_KEYS).toEqual([
			'fileName',
			'locationSource',
			'datetime',
			'bearing',
			'altitude'
		]);
		expect(GEO_PHOTO_ATTRIBUTE_KEYS).not.toContain('imageUrl');
		expect(GEO_PHOTO_ATTRIBUTE_KEYS).not.toContain('iconImageUrl');
		expect(GEO_PHOTO_ATTRIBUTE_KEYS).not.toContain('coverImageUrl');
		expect(GEO_PHOTO_ATTRIBUTE_FIELDS).toEqual([
			{ key: 'fileName', label: 'ファイル名' },
			{
				key: 'locationSource',
				label: '位置情報の取得元',
				valueDict: { exif: 'EXIF GPS', device: '端末の現在地' }
			},
			{ key: 'datetime', label: '撮影日時' },
			{ key: 'bearing', label: '撮影方位', unit: '°' },
			{ key: 'altitude', label: '高度', unit: 'm' }
		]);
	});

	it('GPS付き写真を保持し、GPSなしの複数枚に一度だけ確認した現在地を使う', async () => {
		vi.mocked(gps).mockResolvedValueOnce({ latitude: 1, longitude: 2 });
		const resolveMissingLocation = vi.fn(async () => ({ lat: 3, lng: 4 }));
		const result = await parseGeoPhotos([
			photo('test-gps.jpg'),
			photo('test-no-gps.png'),
			photo('test-no-gps-2.jpg')
		], { resolveMissingLocation });
		expect(resolveMissingLocation).toHaveBeenCalledExactlyOnceWith(2);
		expect(result.features.map((feature) => feature.geometry.coordinates)).toEqual([[2, 1], [
			4,
			3
		], [4, 3]]);
		expect(result.features.map((feature) => feature.properties.locationSource)).toEqual([
			'exif',
			'device',
			'device'
		]);
		expect(result.skippedCount).toBe(0);
	});

	it('GPSがゼロの座標でも有効とし、全写真にGPSがあれば確認しない', async () => {
		vi.mocked(gps).mockResolvedValue({ latitude: 0, longitude: 0 });
		const resolveMissingLocation = vi.fn();
		expect(await hasExifGps(photo('test-zero.jpg'))).toBe(true);
		const result = await parseGeoPhotos([photo('test-zero.jpg')], { resolveMissingLocation });
		expect(result.features[0].geometry.coordinates).toEqual([0, 0]);
		expect(resolveMissingLocation).not.toHaveBeenCalled();
	});

	it('現在地を使わない場合はGPSなしだけ読み飛ばす', async () => {
		vi.mocked(gps).mockResolvedValueOnce({ latitude: 1, longitude: 2 });
		const result = await parseGeoPhotos([photo('test-gps.jpg'), photo('test-no-gps.jpg')], {
			resolveMissingLocation: async () => null
		});
		expect(result.features).toHaveLength(1);
		expect(result.skippedCount).toBe(1);
	});

	it('確認がなければ従来通りGPSなしを読み飛ばす', async () => {
		expect(await parseGeoPhotos([photo('test-no-gps.jpg')])).toEqual({
			features: [],
			skippedCount: 1
		});
		expect(URL.createObjectURL).not.toHaveBeenCalled();
	});

	it('位置取得失敗時には画像変換を開始しない', async () => {
		await expect(parseGeoPhotos([photo('test-no-gps.heic')], {
			resolveMissingLocation: async () => {
				throw new Error('test-location-error');
			}
		})).rejects.toThrow('test-location-error');
		expect(URL.createObjectURL).not.toHaveBeenCalled();
	});

	it('確認中のキャンセル後は画像を生成しない', async () => {
		const controller = new AbortController();
		await expect(parseGeoPhotos([photo('test-no-gps.jpg')], {
			signal: controller.signal,
			resolveMissingLocation: async () => {
				controller.abort();
				return { lat: 3, lng: 4 };
			}
		})).rejects.toMatchObject({ name: 'AbortError' });
		expect(URL.createObjectURL).not.toHaveBeenCalled();
	});
});
