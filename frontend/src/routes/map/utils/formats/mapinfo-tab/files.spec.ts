import { describe, expect, it } from 'vitest';
import { MAX_TAB_BYTES, prepareMapInfoFiles } from './files';

const file = (path: string, content = 'test') =>
	Object.assign(new File([content], path.split('/').pop()!), { morivisRelativePath: path });
const header =
	'!table\n!version 300\n!charset WindowsJapanese\nDefinition Table\n Type NATIVE Charset "WindowsJapanese"\n Fields 1\n name Char (10);';
const set = (folder = 'test-a', name = 'TEST') =>
	['tab', 'dat', 'map', 'id'].map(ext =>
		file(`${folder}/${name}.${ext}`, ext === 'tab' ? header : 'test')
	);
describe('MapInfo file pairing', () => {
	it('フォルダ・名前を合わせ、大小文字を吸収して一式だけを渡す', async () => {
		const files = set();
		files[1] = file('test-a/test.DAT');
		const result = await prepareMapInfoFiles([
			...set('test-b'),
			...files,
			file('test-a/TEST.ind')
		], files[0]);
		expect(result.map(f => f.name)).toEqual([
			'table.tab',
			'table.dat',
			'table.map',
			'table.id',
			'table.ind'
		]);
		expect(await result[0].text()).toBe(header);
	});
	it.each(['dat', 'map', 'id'])('欠けた%sを通知する', async ext => {
		const files = set().filter(f => !f.name.endsWith(`.${ext}`));
		await expect(prepareMapInfoFiles(files, files[0])).rejects.toThrow(ext.toUpperCase());
	});
	it('同名の候補を選び間違えない', async () => {
		const files = set();
		await expect(prepareMapInfoFiles([...files, file('test-a/test.MAP')], files[0])).rejects
			.toThrow('重複');
	});
	it('DBFの明示参照を正規化し、ヘッダーの既存バイトを保つ', async () => {
		const tab = file('test.tab', header.replace('NATIVE', 'DBF') + '\n File "attrs.DBF"\n');
		const result = await prepareMapInfoFiles([
			tab,
			file('attrs.dbf'),
			file('test.map'),
			file('test.id')
		], tab);
		expect(result[1].name).toBe('table.dbf');
		expect(await result[0].text()).toContain('File "table.dbf"');
		expect(await result[0].text()).toContain('Charset "WindowsJapanese"');
	});
	it('別種のTAB・外部参照・過大入力を拒否する', async () => {
		for (
			const text of [
				'test',
				header.replace('NATIVE', 'RASTER'),
				header + '\n File "../test.dat"'
			]
		) {
			const tab = file('test.tab', text);
			await expect(prepareMapInfoFiles([tab], tab)).rejects.toThrow();
		}
		const files = set();
		Object.defineProperty(files[1], 'size', { value: MAX_TAB_BYTES + 1 });
		await expect(prepareMapInfoFiles(files, files[0])).rejects.toThrow('256 MiB');
	});
});
