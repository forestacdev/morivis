import { afterEach, describe, expect, it, vi } from 'vitest';

const decoder = vi.hoisted(() => ({ loads: 0, convert: vi.fn() }));

vi.mock('heic-to', () => {
	decoder.loads++;
	return { heicTo: decoder.convert };
});

vi.mock('exifr', () => ({
	gps: vi.fn(async () => ({ latitude: 1, longitude: 2 })),
	parse: vi.fn(async () => ({}))
}));

import { gps } from 'exifr';
import { hasExifGps, parseGeoPhotos } from '.';

afterEach(() => vi.restoreAllMocks());

describe('HEIC decoder loading', () => {
	it('GPS判定やJPEGではロードせず、GPS付きHEICの変換時に初めてロードする', async () => {
		vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-photo');
		vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
		decoder.convert.mockResolvedValue(new Blob(['test-converted'], { type: 'image/png' }));
		const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'test-photo.jpg');
		const heic = new File(['\0\0\0\x18ftypheic'], 'test-photo.heic');

		expect(await hasExifGps(heic)).toBe(true);
		expect((await parseGeoPhotos([jpeg])).features).toHaveLength(1);
		vi.mocked(gps).mockRejectedValueOnce(new Error('test-no-gps'));
		expect((await parseGeoPhotos([heic])).skippedCount).toBe(1);
		expect(decoder.loads).toBe(0);

		expect((await parseGeoPhotos([heic])).features).toHaveLength(1);
		expect(decoder.loads).toBe(1);
		expect(decoder.convert).toHaveBeenCalledWith({
			blob: heic,
			type: 'image/png',
			quality: 0.92
		});

		decoder.convert.mockRejectedValueOnce(new Error('test-decode-failure'));
		expect((await parseGeoPhotos([heic])).features[0].properties.imageUrl).toBe(
			'blob:test-photo'
		);
	});
});
