import { describe, expect, it, vi } from 'vitest';
import { createMcaUploadGrid, mergeMcaUploadFiles } from './upload-grid';

const file = (name: string) => new File(['test'], name);

describe('MCAダイアログのリージョングリッド', () => {
	it('スクロール用の周辺セルを追加しても既存セルと原点の位置関係が変わらない', () => {
		const files = [file('r.0.0.mca'), file('r.5.0.mca')];
		const center = { x: 0, z: 0 };
		const view = createMcaUploadGrid(files, center);
		const padded = createMcaUploadGrid(files, center, { columns: 11, rows: 9 });
		expect(padded.cells).toHaveLength(99);
		const interior = padded.cells.filter(cell =>
			cell.x >= -4 && cell.x <= 4 && cell.z >= -3 && cell.z <= 3
		);
		expect(interior).toEqual(view.cells);
		expect(padded.origin).toEqual({
			column: view.origin!.column + 1,
			row: view.origin!.row + 1
		});
		expect(padded.cells.find(cell => cell.x === 5 && cell.z === 0)?.loaded).toBe(true);
	});
	it.each([{ columns: 0, rows: 7 }, { columns: 9, rows: -1 }, { columns: 1.5, rows: 7 }])(
		'不正な表示範囲を拒否する: %j',
		dimensions => {
			expect(() => createMcaUploadGrid([], undefined, dimensions)).toThrow('行列数');
		}
	);

	it('ワールド原点はr.0.0の北西の境界交点に置く', () => {
		const grid = createMcaUploadGrid([]);
		expect(grid.origin).toEqual({ column: 4, row: 3 });
		const cell = grid.cells[grid.origin!.row * grid.columns + grid.origin!.column];
		expect([cell.x, cell.z]).toEqual([0, 0]);
		expect(createMcaUploadGrid([], { x: 1, z: -1 }).origin).toEqual({ column: 3, row: 4 });
	});
	it.each([
		{ center: { x: 4, z: 3 }, origin: { column: 0, row: 0 } },
		{ center: { x: -5, z: -4 }, origin: { column: 9, row: 7 } },
		{ center: { x: 5, z: 0 }, origin: null },
		{ center: { x: 0, z: -5 }, origin: null }
	])('境界上の原点は表示し、表示範囲外では隠す: $center', ({ center, origin }) => {
		expect(createMcaUploadGrid([], center).origin).toEqual(origin);
	});

	it('空のときは原点周辺を表示し、ハイライトしない', () => {
		const grid = createMcaUploadGrid([]);
		expect(grid.center).toEqual({ x: 0, z: 0 });
		expect(grid.cells).toHaveLength(63);
		expect(grid.cells.some(cell => cell.loaded)).toBe(false);
		expect(grid.regionCount).toBe(0);
	});
	it('負の座標もファイル名だけで判定し、上が小Z・右が大Xになる', () => {
		const files = [file('r.-2.-1.mca'), file('r.0.1.MCA')];
		const reads = files.map(value => vi.spyOn(value, 'arrayBuffer'));
		const grid = createMcaUploadGrid(files);
		expect(grid.center).toEqual({ x: -1, z: 0 });
		expect(grid.cells.filter(cell => cell.loaded).map(cell => [cell.x, cell.z])).toEqual([[
			-2,
			-1
		], [0, 1]]);
		expect(grid.cells[1].x).toBe(grid.cells[0].x + 1);
		expect(grid.cells[grid.columns].z).toBe(grid.cells[0].z + 1);
		expect(grid.outsideCount).toBe(0);
		for (const read of reads) expect(read).not.toHaveBeenCalled();
	});
	it('近接する追加ファイルを既存区画と一緒にハイライトする', () => {
		const files = mergeMcaUploadFiles([file('r.0.0.mca')], [file('r.1.0.mca')]);
		const grid = createMcaUploadGrid(files);
		expect(grid.cells.filter(cell => cell.loaded).map(cell => cell.name)).toEqual([
			'r.0.0.mca',
			'r.1.0.mca'
		]);
	});
	it('離れたファイルでもセル数を増やさず、中心移動で対象を表示する', () => {
		const files = [file('r.-1000000.-1000000.mca'), file('r.1000000.1000000.mca')];
		const first = createMcaUploadGrid(files);
		expect(first.cells).toHaveLength(63);
		expect(first.outsideCount).toBe(1);
		expect(first.cells.find(cell => cell.loaded)?.x).toBe(-1000000);
		const moved = createMcaUploadGrid(files, { x: 1000000, z: 1000000 });
		expect(moved.cells).toHaveLength(63);
		expect(moved.cells.find(cell => cell.loaded)?.name).toBe('r.1000000.1000000.mca');
		expect(moved.outsideCount).toBe(1);
	});
	it('不正名は区画に割り当てず、重複名は一つの区画として数える', () => {
		const grid = createMcaUploadGrid([
			file('test-invalid.mca'),
			file('r.0.0.mca'),
			file('r.00.0.MCA')
		]);
		expect(grid.regionCount).toBe(1);
		expect(grid.cells.find(cell => cell.loaded)?.files).toEqual(['r.0.0.mca', 'r.00.0.MCA']);
	});
	it('不正な中心座標は自動位置に戻す', () => {
		expect(createMcaUploadGrid([file('r.2.1.mca')], { x: Infinity, z: 0 }).center).toEqual({
			x: 2,
			z: 1
		});
	});
});

describe('MCAファイルの追加', () => {
	it('既存順を保ち、同じ座標は最新のファイルへ置き換える', () => {
		const a = file('r.0.0.mca');
		const b = file('r.1.0.mca');
		const replacement = file('r.00.0.MCA');
		const c = file('r.-1.0.mca');
		const current = [a, b];
		expect(mergeMcaUploadFiles(current, [replacement, c])).toEqual([replacement, b, c]);
		expect(current).toEqual([a, b]);
		expect(mergeMcaUploadFiles(current, [a])).toEqual(current);
	});
	it('一回の追加でも同じ座標を二重登録しない', () => {
		const a = file('r.0.0.mca');
		const b = file('r.0.0.MCA');
		expect(mergeMcaUploadFiles([], [a, b])).toEqual([b]);
	});
	it('追加の一部が不正でも既存ファイルを変更しない', () => {
		const current = [file('r.0.0.mca')];
		expect(() => mergeMcaUploadFiles(current, [file('r.1.0.mca'), file('test-invalid.mca')]))
			.toThrow('test-invalid.mca');
		expect(current).toHaveLength(1);
	});
	it('初回ドロップの不正ファイルを黙って除外せず、削除で修復できるよう残す', () => {
		const invalid = file('test-invalid.mca');
		const valid = file('r.0.0.mca');
		expect(mergeMcaUploadFiles([invalid], [valid])).toEqual([invalid, valid]);
	});
});
