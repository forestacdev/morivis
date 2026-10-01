import { describe, expect, it } from 'vitest';
import { findDmIndexFiles, resolveDmZone, zoneFromDrawingId } from './zone';

describe('DMの系番号候補', () => {
	it.each(['07AB00', '07AB001', '07AB000A', '07AB0099', '07AB00AA'])(
		'地図情報レベルごとの図郭番号を読む: %s',
		id => {
			expect(zoneFromDrawingId(id)).toBe(7);
		}
	);
	it('DMI、インデックス、図郭の順に選ぶ', () => {
		expect(resolveDmZone([3], [5], ['07AB001'])).toMatchObject({ zone: 3, source: 'dmi' });
		expect(resolveDmZone([], [5], ['07AB001'])).toMatchObject({ zone: 5, source: 'index' });
		expect(resolveDmZone([], [], ['07AB001'])).toMatchObject({ zone: 7, source: 'drawing' });
	});
	it.each(['07test', '00AB001', '20AB001', '07AB001-extra', 'test-dm'])(
		'任意番号や系番号範囲外は推定しない: %s',
		id => {
			expect(zoneFromDrawingId(id)).toBeNull();
		}
	);
	it('不正なインデックスは次の候補へ進む', () => {
		expect(resolveDmZone([0, 20], [-1], ['07AB001'])).toMatchObject({
			zone: 7,
			source: 'drawing'
		});
	});
	it('上位候補に矛盾があれば決め打ちせず警告を返す', () => {
		expect(resolveDmZone([3, 5], [5], ['07AB001'])).toMatchObject({
			zone: null,
			warning: expect.any(String)
		});
		expect(resolveDmZone([], [], ['07AB001', '08AB001'])).toMatchObject({
			zone: null,
			warning: expect.any(String)
		});
	});
	it('同じフォルダのDMIだけを選び、入力順と拡張子の大小に依存しない', () => {
		const files = ['test-a/INDEX.DMI', 'test-b/INDEX.dmi', 'test-a/test.dm'].map(path => {
			const file = new File([], path.split('/').pop()!);
			Object.defineProperty(file, 'morivisRelativePath', { value: path });
			return file;
		});
		expect(findDmIndexFiles(files[2], files)).toEqual([files[0]]);
	});
});
