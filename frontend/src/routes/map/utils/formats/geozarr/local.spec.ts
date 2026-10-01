import { resolveDroppedFiles } from '$routes/map/components/upload/upload-drop';
import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import * as zarr from 'zarrita';
import { createTestZarrStore } from './__fixtures__/test-store';
import {
	createLocalGeoZarrStore,
	isGeoZarrZip,
	isLocalGeoZarrFolder,
	type LocalGeoZarrInput
} from './local';

const folder = (
	version: 2 | 3,
	prefix = 'test.zarr/',
	root = false
): LocalGeoZarrInput & { type: 'folder'; } => ({
	type: 'folder',
	files: [...createTestZarrStore(version, false, root)].map(([path, bytes]) => {
		const file = new File([bytes as Uint8Array<ArrayBuffer>], path.split('/').pop()!);
		Object.defineProperty(file, 'morivisRelativePath', { value: prefix + path });
		return { path: prefix + path, file };
	})
});
const archive = async (input: LocalGeoZarrInput & { type: 'folder'; }): Promise<File> => {
	const zip = new JSZip();
	for (const { path, file } of input.files) zip.file(path, await file.arrayBuffer());
	return new File(
		[await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })],
		'test.zarr.zip'
	);
};
describe('ローカルZarr', () => {
	it.each([2, 3] as const)(
		'v%dのフォルダーとZIPをZarrへ振り分け、配列を読める',
		async version => {
			const input = folder(version);
			const files = input.files.map(item => item.file);
			expect(isLocalGeoZarrFolder(files)).toBe(true);
			expect(await resolveDroppedFiles(files)).toMatchObject({
				dialogType: 'geozarr',
				dropFiles: files
			});
			const file = await archive(input);
			expect(await isGeoZarrZip(file)).toBe(true);
			expect(await resolveDroppedFiles([file])).toMatchObject({
				dialogType: 'geozarr',
				dropFiles: [file]
			});
			for (const source of [input, { type: 'zip' as const, file }]) {
				const store = await createLocalGeoZarrStore(source);
				const array = await zarr.open(zarr.root(store).resolve('test-values'), {
					kind: 'array'
				});
				const values = await zarr.get(array);
				expect(Array.from(values.data)).toEqual(
					Array.from({ length: 16 }, (_, i) => i === 0 ? -999 : i - 1)
				);
				expect(store.contents().some(item => item.path === '/test-values')).toBe(true);
				expect(await store.get('/test-missing')).toBeUndefined();
			}
		}
	);
	it('ルート配列とラッパーフォルダーのないZIPを読める', async () => {
		const input = folder(3, '', true);
		const store = await createLocalGeoZarrStore({ type: 'zip', file: await archive(input) });
		expect((await zarr.open(store, { kind: 'array' })).shape).toEqual([4, 4]);
	});
	it('フォルダーのチャンク本体は要求時だけ読み、Rangeと中断を扱う', async () => {
		const input = folder(3);
		const chunk = input.files.find(item => item.path.endsWith('test-values/c/0/0'))!.file;
		const read = vi.spyOn(chunk, 'arrayBuffer');
		const store = await createLocalGeoZarrStore(input);
		expect(read).not.toHaveBeenCalled();
		expect(await store.getRange!('/test-values/c/0/0', { offset: 4, length: 4 })).toEqual(
			new Uint8Array(4)
		);
		expect(await store.getRange!('/test-values/c/0/0', { suffixLength: 4 })).toHaveLength(4);
		const controller = new AbortController();
		controller.abort();
		await expect(store.get('/test-values/c/0/0', { signal: controller.signal })).rejects
			.toMatchObject({ name: 'AbortError' });
		expect(read).not.toHaveBeenCalled();
	});
	it('複数データセット、重複パス、不正な相対パスは拒否する', async () => {
		const input = folder(2);
		await expect(
			createLocalGeoZarrStore({
				type: 'folder',
				files: [...input.files, ...folder(2, 'test-other.zarr/').files]
			})
		).rejects.toThrow('1つずつ');
		await expect(
			createLocalGeoZarrStore({ type: 'folder', files: [...input.files, input.files[0]] })
		).rejects.toThrow('重複');
		await expect(
			createLocalGeoZarrStore({
				type: 'folder',
				files: [{ ...input.files[0], path: '../.zarray' }]
			})
		).rejects.toThrow('不正');
		const zip = new JSZip();
		zip.file('../test.zarr/.zarray', '{}');
		await expect(
			createLocalGeoZarrStore({
				type: 'zip',
				file: new File([await zip.generateAsync({ type: 'arraybuffer' })], 'test.zip')
			})
		).rejects.toThrow('不正');
	});
	it('ZIPの展開上限を超えるメタデータを拒否する', async () => {
		const zip = new JSZip();
		zip.file('test.zarr/.zarray', ' '.repeat(8 * 1024 * 1024 + 1));
		const store = await createLocalGeoZarrStore({
			type: 'zip',
			file: new File([
				await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })
			], 'test.zip')
		});
		await expect(store.get('/.zarray')).rejects.toThrow('上限');
	});
	it('通常のJSONやZIPをZarrに誤判定しない', async () => {
		expect(isLocalGeoZarrFolder([new File(['{}'], 'test.json')])).toBe(false);
		const zip = new JSZip();
		zip.file('test.geojson', '{}');
		expect(
			await isGeoZarrZip(
				new File([await zip.generateAsync({ type: 'arraybuffer' })], 'test.zip')
			)
		).toBe(false);
	});
});
