import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$routes/map/data/entries/model', () => ({ createGlbEntry: vi.fn() }));
vi.mock('$routes/stores/confirmation', () => ({ showConfirmDialog: vi.fn() }));
vi.mock('$routes/stores/notification', () => ({ showNotification: vi.fn() }));

import { showConfirmDialog } from '$routes/stores/confirmation';
import { checkLargeDroppedFiles } from './upload-drop-actions';

describe('checkLargeDroppedFiles', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	it('3D Tilesのフォルダは総容量による一括読み込み確認を出さない', async () => {
		const root = new File(
			[JSON.stringify({ asset: { version: '1.0' }, root: {} })],
			'tileset.json'
		);
		const tile = new File(['test'], 'test.b3dm');
		Object.defineProperty(tile, 'size', { value: 200 * 1024 * 1024 });
		expect(await checkLargeDroppedFiles([root, tile])).toBe(true);
		expect(showConfirmDialog).not.toHaveBeenCalled();
	});
	it('逐次処理するMCA一式は合計容量による確認を出さない', async () => {
		const files = ['r.0.0.mca', 'r.1.0.MCA'].map(name => {
			const file = new File(['test'], name);
			Object.defineProperty(file, 'size', { value: 80 * 1024 * 1024 });
			return file;
		});
		expect(await checkLargeDroppedFiles(files)).toBe(true);
		expect(showConfirmDialog).not.toHaveBeenCalled();
	});
	it('MCAと他形式が混在する場合は容量確認を維持する', async () => {
		const file = new File(['test'], 'r.0.0.mca');
		Object.defineProperty(file, 'size', { value: 200 * 1024 * 1024 });
		vi.mocked(showConfirmDialog).mockResolvedValue(false);
		expect(await checkLargeDroppedFiles([file, new File(['test'], 'test.glb')])).toBe(false);
		expect(showConfirmDialog).toHaveBeenCalledOnce();
	});
	it('ほかの大容量ファイルは既存の確認を維持する', async () => {
		const file = new File(['test'], 'test.glb');
		Object.defineProperty(file, 'size', { value: 200 * 1024 * 1024 });
		vi.mocked(showConfirmDialog).mockResolvedValue(false);
		expect(await checkLargeDroppedFiles(file)).toBe(false);
		expect(showConfirmDialog).toHaveBeenCalledOnce();
	});
	it('MVTフォルダは必要なタイルだけ読むため容量確認を省略する', async () => {
		const file = new File(['test'], '1.mvt');
		Object.defineProperty(file, 'morivisRelativePath', { value: 'test-set/2/1/1.mvt' });
		Object.defineProperty(file, 'size', { value: 200 * 1024 * 1024 });
		expect(await checkLargeDroppedFiles([file])).toBe(true);
		expect(showConfirmDialog).not.toHaveBeenCalled();
	});
	it('ラスタータイルフォルダも一括読み込みの容量確認を省略する', async () => {
		const file = new File(['test-image'], '1.png');
		Object.defineProperty(file, 'morivisRelativePath', { value: 'test-set/2/1/1.png' });
		Object.defineProperty(file, 'size', { value: 200 * 1024 * 1024 });
		expect(await checkLargeDroppedFiles([file])).toBe(true);
		expect(showConfirmDialog).not.toHaveBeenCalled();
	});
});

describe('ファイル一式の容量確認', () => {
	const sized = (name: string, mib: number) => {
		const file = new File(['test'], name);
		Object.defineProperty(file, 'size', { value: mib * 1024 * 1024 });
		return file;
	};
	beforeEach(() => vi.clearAllMocks());
	it('100 MiB未満は確認せず、合計100 MiBちょうどで確認する', async () => {
		vi.mocked(showConfirmDialog).mockResolvedValue(true);
		const shp = sized('test.shp', 60);
		expect(await checkLargeDroppedFiles([shp, sized('test.dbf', 39)])).toBe(true);
		expect(showConfirmDialog).not.toHaveBeenCalled();
		expect(await checkLargeDroppedFiles([shp, sized('test.dbf', 40)])).toBe(true);
		expect(showConfirmDialog).toHaveBeenCalledOnce();
	});
	it('承認済みの一式は再確認せず、追加・差し替え後は再確認する', async () => {
		vi.mocked(showConfirmDialog).mockResolvedValue(true);
		const shp = sized('test.shp', 60);
		const dbf = sized('test.dbf', 40);
		await checkLargeDroppedFiles([shp, dbf]);
		await checkLargeDroppedFiles([dbf, shp]);
		expect(showConfirmDialog).toHaveBeenCalledTimes(1);
		await checkLargeDroppedFiles([shp, dbf, sized('test.shx', 1)]);
		expect(showConfirmDialog).toHaveBeenCalledTimes(2);
		await checkLargeDroppedFiles([shp, sized('test.dbf', 40)]);
		expect(showConfirmDialog).toHaveBeenCalledTimes(3);
	});
	it('キャンセルを承認として記録しない', async () => {
		vi.mocked(showConfirmDialog).mockResolvedValue(false);
		const files = [sized('test.shp', 60), sized('test.dbf', 40)];
		expect(await checkLargeDroppedFiles(files)).toBe(false);
		expect(await checkLargeDroppedFiles(files)).toBe(false);
		expect(showConfirmDialog).toHaveBeenCalledTimes(2);
	});
});
