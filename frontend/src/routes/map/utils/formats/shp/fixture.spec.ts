import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { isWgs84PrjMock, transformGeoJSONParallelMock, showNotificationMock } = vi.hoisted(() => ({
	isWgs84PrjMock: vi.fn(),
	transformGeoJSONParallelMock: vi.fn(),
	showNotificationMock: vi.fn()
}));

vi.mock('$routes/map/utils/proj', () => ({
	isWgs84Prj: isWgs84PrjMock,
	transformGeoJSONParallel: transformGeoJSONParallelMock
}));

vi.mock('$routes/stores/notification', () => ({
	showNotification: showNotificationMock
}));

import { readCpgEncoding, shpFileToGeojson } from '.';

class MockFileReader {
	result: ArrayBuffer | null = null;
	onload: ((event: { target: MockFileReader; }) => void) | null = null;

	readAsArrayBuffer(file: Blob) {
		file.arrayBuffer().then((buffer) => {
			this.result = buffer;
			this.onload?.({ target: this });
		});
	}
}

const fixtureDir = resolve(import.meta.dirname, '__fixtures__', 'sample-point');
const shpBytes = readFileSync(resolve(fixtureDir, 'sample-point.shp'));
const shxBytes = readFileSync(resolve(fixtureDir, 'sample-point.shx'));
const dbfBytes = readFileSync(resolve(fixtureDir, 'sample-point.dbf'));
const prjText = readFileSync(resolve(fixtureDir, 'sample-point.prj'), 'utf8');
const cpgText = readFileSync(resolve(fixtureDir, 'sample-point.cpg'), 'utf8');

const createBinaryFile = (name: string, bytes: Buffer) =>
	new File([bytes], name, { type: 'application/octet-stream' });

const createTextFile = (name: string, text: string) => new File([text], name, { type: 'text/plain' });

beforeEach(() => {
	vi.stubGlobal('FileReader', MockFileReader);
	isWgs84PrjMock.mockReset();
	transformGeoJSONParallelMock.mockReset();
	showNotificationMock.mockReset();
	isWgs84PrjMock.mockReturnValue(true);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('shp parser fixture', () => {
	it('本物の shapefile fixture を GeoJSON に変換できる', async () => {
		const cpgEncoding = await readCpgEncoding(createTextFile('sample-point.cpg', cpgText));
		const result = await shpFileToGeojson(
			createBinaryFile('sample-point.shp', shpBytes),
			createBinaryFile('sample-point.dbf', dbfBytes),
			prjText,
			cpgEncoding
		);

		expect(result.features).toHaveLength(1);
		expect(result.features[0]?.geometry.type).toBe('Point');
		expect(result.features[0]?.geometry.coordinates).toEqual([139.6917, 35.6895]);
		expect(String(result.features[0]?.properties?.NAME).replace(/\0+$/g, '')).toBe('Sample Point');
	});

	it('fixture の補助ファイルが存在する', () => {
		expect(shpBytes.byteLength).toBeGreaterThan(0);
		expect(shxBytes.byteLength).toBeGreaterThan(0);
		expect(dbfBytes.byteLength).toBeGreaterThan(0);
	});
});
