import { describe, expect, it } from 'vitest';
import { findRawRasterFiles } from './files';

const file = (path: string) =>
	Object.assign(new File([], path.split('/').pop()!), { morivisRelativePath: path });
describe('raw raster file pairing', () => {
	it.each(['test.hdr', 'test.bil.hdr'])(
		'同じフォルダの本体・PRJ・worldを対応付ける: %s',
		name => {
			const header = file(`test-a/${name}`), data = file('test-a/TEST.bil');
			const prj = file('test-a/test.prj'), world = file('test-a/test.blw');
			const result = findRawRasterFiles([
				header,
				data,
				prj,
				world,
				file('test-b/test.bil'),
				file('test-b/test.prj')
			], header);
			expect(result).toEqual({ header, data, prj, world });
		}
	);
	it('拡張子なしのENVI本体に対応する', () => {
		const header = file('test.hdr'), data = file('test');
		expect(findRawRasterFiles([header, data, file('test-other.prj')], header)).toEqual({
			header,
			data,
			prj: null,
			world: null
		});
	});
	it('欠落・曖昧な本体・重複した付属ファイルを拒否する', () => {
		const header = file('test.hdr'), data = file('test.bil');
		expect(() => findRawRasterFiles([header], header)).toThrow('一緒に');
		expect(() => findRawRasterFiles([header, data, file('test.bsq')], header)).toThrow('複数');
		expect(() => findRawRasterFiles([header, data, file('test.prj'), file('test.PRJ')], header))
			.toThrow('PRJ');
		expect(() => findRawRasterFiles([header, data, file('test.blw'), file('test.wld')], header))
			.toThrow('ワールド');
	});
});
