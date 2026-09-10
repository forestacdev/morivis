import { describe, expect, it } from 'vitest';

import { mergeUploadFileDescription, mergeUploadFiles } from './upload-file-description';

const createTestFile = (name: string, size: number, lastModified = 1): File =>
	({ name, size, lastModified }) as File;

describe('upload file description', () => {
	it('単一ファイルの名前とサイズを既存descriptionへ追加する', () => {
		const description = mergeUploadFileDescription('ユーザーがアップロードしたデータ', [
			createTestFile('test-data.geojson', 1536)
		]);

		expect(description).toBe(
			'ユーザーがアップロードしたデータ。ファイル名: test-data.geojson、ファイルサイズ: 1.5 KB。'
		);
	});

	it('既存descriptionにファイルサイズがあれば重複させない', () => {
		const description = mergeUploadFileDescription('Binary FBX 7400、ファイルサイズ: 2 MB。', [
			createTestFile('test-model.fbx', 2 * 1024 * 1024)
		]);

		expect(description).toBe(
			'Binary FBX 7400、ファイルサイズ: 2 MB。ファイル名: test-model.fbx。'
		);
	});

	it('複数ファイルは件数・代表ファイル名・合計サイズを記録する', () => {
		const files = Array.from(
			{ length: 7 },
			(_, index) => createTestFile(`test-part-${index + 1}.dat`, 1024)
		);

		expect(mergeUploadFileDescription(undefined, files)).toBe(
			'構成ファイル: 7件（test-part-1.dat、test-part-2.dat、test-part-3.dat、test-part-4.dat、test-part-5.dat、ほか2件）、合計ファイルサイズ: 7 KB。'
		);
	});

	it('同じファイルを追加しても重複しない', () => {
		const file = createTestFile('test-data.shp', 1024);
		expect(mergeUploadFiles([file], [file])).toEqual([file]);
	});
});
