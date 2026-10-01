import { getShapefileDataset } from '$routes/map/utils/formats/shp/files';
import { describe, expect, it } from 'vitest';
import { createEmptyShapeFileFormState, mergeShapeRelatedFiles } from './shape-file-form-state';

const createFile = (name: string, path?: string) => {
	const file = new File(['test'], name);
	if (path) Object.defineProperty(file, 'morivisRelativePath', { value: path });
	return file;
};

describe('mergeShapeRelatedFiles', () => {
	it('同じ一式の構成ファイルを後から追加できる', () => {
		const initial = mergeShapeRelatedFiles(createEmptyShapeFileFormState(), [
			createFile('test.shp'),
			createFile('test.dbf')
		]);
		const next = mergeShapeRelatedFiles(initial, [createFile('test.shx')]);
		expect(next.forms.shpFile).toBe(initial.forms.shpFile);
		expect(next.forms.dbfFile).toBe(initial.forms.dbfFile);
		expect(next.forms.shxName).toBe('test.shx');
	});
	it('同じ一式・同じ拡張子は新しいファイルに差し替える', () => {
		const initial = mergeShapeRelatedFiles(createEmptyShapeFileFormState(), [
			createFile('test.prj')
		]);
		const replacement = createFile('test.prj');
		expect(mergeShapeRelatedFiles(initial, [replacement]).forms.prjFile).toBe(replacement);
	});
	it('別の基本名を混ぜた追加は元の状態を変更せず拒否する', () => {
		const initial = mergeShapeRelatedFiles(createEmptyShapeFileFormState(), [
			createFile('test-a.shp')
		]);
		expect(() => mergeShapeRelatedFiles(initial, [createFile('test-b.dbf')])).toThrow(
			'同じ基本名'
		);
		expect(initial.forms.dbfFile).toBeNull();
	});
	it('複数セットを一度にドロップしても最後のセットで上書きしない', () => {
		expect(() =>
			mergeShapeRelatedFiles(createEmptyShapeFileFormState(), [
				createFile('test-a.shp'),
				createFile('test-b.shp')
			])
		).toThrow('一式');
	});
	it('同名でも別フォルダなら拒否する', () => {
		expect(() =>
			getShapefileDataset([
				createFile('test.shp', 'test-a/test.shp'),
				createFile('test.dbf', 'test-b/test.dbf')
			])
		).toThrow('同じフォルダ');
	});
	it('ZIPとフォルダ選択の相対パスを使う', () => {
		const shp = createFile('test.shp', 'test-folder/test.shp');
		const dbf = createFile('test.dbf');
		Object.defineProperty(dbf, 'webkitRelativePath', { value: 'test-folder/test.dbf' });
		expect(getShapefileDataset([shp, dbf])).toEqual({
			name: 'test-folder/test',
			files: [shp, dbf]
		});
	});
	it('同じ一式で拡張子が重複している入力を拒否する', () => {
		expect(() => getShapefileDataset([createFile('test.shp'), createFile('test.SHP')])).toThrow(
			'重複'
		);
	});
});
