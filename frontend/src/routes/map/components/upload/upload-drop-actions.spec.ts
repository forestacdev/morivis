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
});
