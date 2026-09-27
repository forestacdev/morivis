import { describe, expect, it } from 'vitest';
import { findAsciiGridPrj, isAsciiGridFile } from './files';

const file = (path: string) =>
	Object.assign(new File([], path.split('/').pop()!), { morivisRelativePath: path });
describe('ASCII Grid sidecar', () => {
	it('同じフォルダ・同じベース名を大小文字を問わず対応付ける', () => {
		const grid = file('test-a/test-grid.ASC');
		const right = file('test-a/TEST-GRID.prj');
		const wrong = file('test-b/test-grid.prj');
		expect(isAsciiGridFile(grid)).toBe(true);
		expect(findAsciiGridPrj([wrong, right], grid)).toBe(right);
		expect(findAsciiGridPrj([wrong], grid)).toBeNull();
	});
	it('無関係なPRJを採用せず、重複は明示的にエラーにする', () => {
		const grid = file('test.asc');
		expect(findAsciiGridPrj([file('test-other.prj')], grid)).toBeNull();
		expect(() => findAsciiGridPrj([file('test.prj'), file('test.PRJ')], grid)).toThrow('複数');
	});
});
