import { describe, expect, it } from 'vitest';
import { hasExifGps, parseGeoPhotos } from '.';

const createPlainFile = () =>
	({
		name: 'plain.txt',
		text: async () => 'not an image',
		arrayBuffer: async () => new TextEncoder().encode('not an image').buffer
	}) as File;

describe('exif parser', () => {
	it('EXIF GPS がないファイルは false を返す', async () => {
		await expect(hasExifGps(createPlainFile())).resolves.toBe(false);
	});

	it('GPS がないファイルは skip される', async () => {
		const result = await parseGeoPhotos([createPlainFile()]);

		expect(result.features).toHaveLength(0);
		expect(result.skippedCount).toBe(1);
	});
});
