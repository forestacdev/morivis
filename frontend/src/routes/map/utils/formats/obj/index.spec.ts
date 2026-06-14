import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspectObjFile, parseObjPointCloudFile } from '.';

const pointCloudObj = readFileSync(
	resolve(import.meta.dirname, '__fixtures__', 'point-cloud.obj'),
	'utf8'
);
const meshObj = readFileSync(resolve(import.meta.dirname, '__fixtures__', 'mesh.obj'), 'utf8');

const createFile = (name: string, text: string) =>
	({
		name,
		text: async () => text
	}) as File;

describe('obj parser', () => {
	it('点群 OBJ を判定できる', async () => {
		const result = await inspectObjFile(createFile('point-cloud.obj', pointCloudObj));

		expect(result).toEqual({
			isPointCloud: true,
			hasFaces: false,
			vertexCount: 3
		});
	});

	it('点群 OBJ を positions と colors に変換できる', async () => {
		const result = await parseObjPointCloudFile(createFile('point-cloud.obj', pointCloudObj));

		expect(Array.from(result.positions)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
		expect(Array.from(result.colors ?? [])).toEqual([255, 0, 0, 0, 255, 0, 0, 0, 255]);
		expect(result.pointCount).toBe(3);
	});

	it('面を持つ OBJ は点群として読めない', async () => {
		await expect(parseObjPointCloudFile(createFile('mesh.obj', meshObj))).rejects.toThrow(
			'面を持つOBJは点群として読み込めません'
		);
	});
});
