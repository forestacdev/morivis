import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
	readMock,
	isWgs84PrjMock,
	transformGeoJSONParallelMock,
	showNotificationMock
} = vi.hoisted(() => ({
	readMock: vi.fn(),
	isWgs84PrjMock: vi.fn(),
	transformGeoJSONParallelMock: vi.fn(),
	showNotificationMock: vi.fn()
}));

vi.mock('shapefile', () => ({
	read: readMock
}));

vi.mock('$routes/map/utils/proj', () => ({
	isWgs84Prj: isWgs84PrjMock,
	transformGeoJSONParallel: transformGeoJSONParallelMock
}));

vi.mock('$routes/stores/notification', () => ({
	showNotification: showNotificationMock
}));

import { readCpgEncoding, shpFileToGeojson } from '.';

type FileLike = File & {
	_text?: string;
	_buffer?: ArrayBuffer;
};

class MockFileReader {
	result: ArrayBuffer | null = null;
	onload: ((event: { target: MockFileReader; }) => void) | null = null;

	readAsArrayBuffer(file: Blob) {
		const source = file as Blob & { arrayBuffer?: () => Promise<ArrayBuffer>; };
		source.arrayBuffer?.().then((buffer) => {
			this.result = buffer;
			this.onload?.({ target: this });
		});
	}
}

const createBinaryFile = (name: string, bytes: number[]): FileLike => {
	const buffer = new Uint8Array(bytes).buffer;
	return {
		name,
		arrayBuffer: async () => buffer,
		text: async () => ''
	} as FileLike;
};

const createTextFile = (name: string, text: string): FileLike =>
	({
		name,
		text: async () => text,
		arrayBuffer: async () => new TextEncoder().encode(text).buffer
	}) as FileLike;

const sampleGeojson = {
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [139.6917, 35.6895]
			},
			properties: {
				name: 'sample'
			}
		}
	]
};

beforeEach(() => {
	vi.stubGlobal('FileReader', MockFileReader);
	readMock.mockReset();
	isWgs84PrjMock.mockReset();
	transformGeoJSONParallelMock.mockReset();
	showNotificationMock.mockReset();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('shp parser', () => {
	it('CPG のよくあるエンコーディング名を正規化できる', async () => {
		await expect(readCpgEncoding(createTextFile('sample.cpg', 'UTF-8'))).resolves.toBe('utf-8');
		await expect(readCpgEncoding(createTextFile('sample.cpg', '932'))).resolves.toBe(
			'shift-jis'
		);
		await expect(readCpgEncoding(createTextFile('sample.cpg', 'EUC-JP'))).resolves.toBe(
			'euc-jp'
		);
	});

	it('PRJ が無い場合は shapefile.read の結果をそのまま返す', async () => {
		readMock.mockResolvedValue(sampleGeojson);

		const result = await shpFileToGeojson(
			createBinaryFile('sample.shp', [1, 2, 3]),
			createBinaryFile('sample.dbf', [4, 5, 6])
		);

		expect(readMock).toHaveBeenCalledTimes(1);
		expect(readMock).toHaveBeenCalledWith(expect.any(ArrayBuffer));
		expect(result).toEqual(sampleGeojson);
	});

	it('WGS84 以外の PRJ なら座標変換を行う', async () => {
		readMock.mockResolvedValue(sampleGeojson);
		isWgs84PrjMock.mockReturnValue(false);
		transformGeoJSONParallelMock.mockResolvedValue({
			...sampleGeojson,
			features: [
				{
					...sampleGeojson.features[0],
					geometry: {
						type: 'Point',
						coordinates: [140, 36]
					}
				}
			]
		});

		const result = await shpFileToGeojson(
			createBinaryFile('sample.shp', [1, 2, 3]),
			createBinaryFile('sample.dbf', [4, 5, 6]),
			'LOCAL_PRJ',
			'utf-8'
		);

		expect(readMock).toHaveBeenCalledWith(
			expect.any(ArrayBuffer),
			expect.any(ArrayBuffer),
			{ encoding: 'utf-8' }
		);
		expect(isWgs84PrjMock).toHaveBeenCalledWith('LOCAL_PRJ');
		expect(transformGeoJSONParallelMock).toHaveBeenCalledWith(sampleGeojson, 'LOCAL_PRJ');
		expect(result.features[0]?.geometry.coordinates).toEqual([140, 36]);
	});

	it('DBF が無い場合は失敗する', async () => {
		await expect(
			shpFileToGeojson(createBinaryFile('sample.shp', [1, 2, 3]))
		).rejects.toThrow('Failed to load .dbf file');
	});
});
