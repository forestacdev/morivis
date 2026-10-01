import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readRawRasterFiles } from './read';

const fixture = (name: string) =>
	new File(
		[new Uint8Array(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url)))],
		name
	);
describe('raw raster sidecars', () => {
	it('PRJをHDRのCRSより優先して渡す', async () => {
		const result = await readRawRasterFiles({
			header: fixture('test-color.hdr'),
			data: fixture('test-color.bil'),
			prj: fixture('test-height.prj'),
			world: null
		});
		expect(result.crs).toContain('GEOGCS[');
	});
	it('位置のないHDRには回転を含むworld fileの中心を外縁へ変換する', async () => {
		const result = await readRawRasterFiles({
			header: new File(['NCOLS 2\nNROWS 2\nXDIM 1\nYDIM 1'], 'test.hdr'),
			data: new File([new Uint8Array([1, 2, 3, 4])], 'test.bil'),
			prj: null,
			world: new File(['0\n1\n1\n0\n0.5\n0.5'], 'test.blw')
		});
		expect(result.transform).toEqual([0, 0, 1, 0, 1, 0]);
		expect(result.bbox).toEqual([0, 0, 2, 2]);
	});
	it('長すぎるHDRを読み取り前に拒否する', async () => {
		const header = Object.assign(new File([], 'test.hdr'), {});
		Object.defineProperty(header, 'size', { value: 1024 * 1024 + 1 });
		await expect(
			readRawRasterFiles({ header, data: fixture('test-color.bil'), prj: null, world: null })
		).rejects.toThrow('1 MiB');
	});
});
