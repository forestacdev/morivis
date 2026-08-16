import { describe, expect, it } from 'vitest';

import { createEmptyShapeFileFormState, mergeShapeRelatedFiles } from './shape-file-form-state';

const createFile = (name: string) => new File(['test'], name, { type: 'application/octet-stream' });

describe('mergeShapeRelatedFiles', () => {
	it('後から追加した拡張子だけを上書きし、既存の他ファイルは保持する', () => {
		const initialState = mergeShapeRelatedFiles(createEmptyShapeFileFormState(), [
			createFile('sample.shp'),
			createFile('sample.dbf')
		]);

		const mergedState = mergeShapeRelatedFiles(initialState, [createFile('sample.shx')]);

		expect(mergedState.forms.shpName).toBe('sample.shp');
		expect(mergedState.forms.dbfName).toBe('sample.dbf');
		expect(mergedState.forms.shxName).toBe('sample.shx');
	});

	it('同じ拡張子は新しいファイルで置き換える', () => {
		const initialState = mergeShapeRelatedFiles(createEmptyShapeFileFormState(), [
			createFile('old.prj')
		]);

		const mergedState = mergeShapeRelatedFiles(initialState, [createFile('new.prj')]);

		expect(mergedState.forms.prjName).toBe('new.prj');
	});
});
