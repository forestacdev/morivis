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
			vertexCount: 3,
			projectedModelEpsg: null
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

	it('COORDINATE_SYSTEM コメントから projectedModelEpsg を判定できる', async () => {
		const result = await inspectObjFile(
			createFile(
				'projected.obj',
				`# COORDINATE_SYSTEM:  OGC_DEF PROJCS["JGD2011 / Japan Plane Rectangular CS IX",GEOGCS["JGD2011",DATUM["Japanese_Geodetic_Datum_2011",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],AUTHORITY["EPSG","6668"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","6668"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",36],PARAMETER["central_meridian",139.833333333333],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["X",EAST],AXIS["Y",NORTH],AUTHORITY["EPSG","6677"]]
v 0 0 0`
			)
		);

		expect(result.projectedModelEpsg).toBe('6677');
	});
});
