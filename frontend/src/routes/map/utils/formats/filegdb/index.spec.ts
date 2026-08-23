import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FeatureCollection } from '$routes/map/types/geojson';

vi.mock('fgdb/dist/fgdb.js', () => ({
	default: vi.fn()
}));

import fgdbRead from 'fgdb/dist/fgdb.js';

import {
	type FileGdbInput,
	FileGdbParseError,
	getFileGdbGeometryTypes,
	parseFileGdbInputs,
	resolveFileGdbInputSet
} from './index';

const createFile = (name: string, relativePath?: string) => {
	const file = new File(['test'], name);

	if (relativePath) {
		Object.defineProperty(file, 'morivisRelativePath', {
			value: relativePath,
			configurable: true
		});
	}

	return file;
};

const createBuffer = (id: number): ArrayBuffer => Uint8Array.from([id]).buffer;

const createFeatureCollection = (geometryType: string): FeatureCollection => ({
	type: 'FeatureCollection',
	features: [
		{
			type: 'Feature',
			properties: { id: geometryType },
			geometry: geometryType === 'Point'
				? { type: 'Point', coordinates: [139.7, 35.6] }
				: geometryType === 'LineString'
				? {
					type: 'LineString',
					coordinates: [
						[139.7, 35.6],
						[139.8, 35.7]
					]
				}
				: {
					type: 'Polygon',
					coordinates: [
						[
							[139.7, 35.6],
							[139.8, 35.6],
							[139.8, 35.7],
							[139.7, 35.6]
						]
					]
				}
		}
	]
});

describe('filegdb format utils', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('morivisRelativePath から FileGDB のルート名を抽出する', () => {
		const resolved = resolveFileGdbInputSet([
			createFile('a00000001.gdbtable', 'roads.gdb/a00000001.gdbtable'),
			createFile('a00000001.gdbtablx', 'roads.gdb/a00000001.gdbtablx')
		]);

		expect(resolved.datasetName).toBe('roads');
		expect(resolved.rootPath).toBe('roads.gdb');
		expect(resolved.inputs).toHaveLength(2);
	});

	it('複数の FileGDB フォルダが混在するとエラーにする', () => {
		expect(() =>
			resolveFileGdbInputSet([
				createFile('a00000001.gdbtable', 'roads.gdb/a00000001.gdbtable'),
				createFile('a00000001.gdbtablx', 'roads.gdb/a00000001.gdbtablx'),
				createFile('a00000001.gdbtable', 'buildings.gdb/a00000001.gdbtable'),
				createFile('a00000001.gdbtablx', 'buildings.gdb/a00000001.gdbtablx')
			])
		).toThrow('複数の FileGDB フォルダは同時に読み込めません');
	});

	it('カタログと各テーブルからレイヤー一覧を組み立てる', () => {
		vi.mocked(fgdbRead).mockImplementation((table: ArrayBuffer) => {
			const id = new Uint8Array(table)[0];

			if (id === 1) {
				return [
					{ Name: 'GDB_SystemCatalog' },
					{ Name: 'Roads' },
					{ Name: 'Nodes' }
				];
			}

			if (id === 9) {
				return createFeatureCollection('LineString');
			}

			if (id === 10) {
				return createFeatureCollection('Point');
			}

			throw new Error(`unexpected table id: ${id}`);
		});

		const result = parseFileGdbInputs(
			[
				{
					name: 'sample.gdb/a00000001.gdbtable',
					data: createBuffer(1)
				},
				{
					name: 'sample.gdb/a00000001.gdbtablx',
					data: createBuffer(1)
				},
				{
					name: 'sample.gdb/a00000009.gdbtable',
					data: createBuffer(9)
				},
				{
					name: 'sample.gdb/a00000009.gdbtablx',
					data: createBuffer(9)
				},
				{
					name: 'sample.gdb/a0000000a.gdbtable',
					data: createBuffer(10)
				},
				{
					name: 'sample.gdb/a0000000a.gdbtablx',
					data: createBuffer(10)
				}
			] satisfies FileGdbInput[]
		);

		expect(result.datasetName).toBe('sample');
		expect(result.layers.map((layer) => layer.name)).toEqual(['Roads', 'Nodes']);
		expect(getFileGdbGeometryTypes(result.layers[0]?.geojson as FeatureCollection)).toEqual([
			'LineString'
		]);
		expect(getFileGdbGeometryTypes(result.layers[1]?.geojson as FeatureCollection)).toEqual([
			'Point'
		]);
	});

	it('gdbtable と gdbtablx の組が欠けるとエラーにする', () => {
		expect(() =>
			parseFileGdbInputs([
				{
					name: 'sample.gdb/a00000001.gdbtable',
					data: createBuffer(1)
				}
			])
		).toThrow('FileGDB の .gdbtable / .gdbtablx ファイルが不足しています');
	});

	it('日本語名の .gdb でも catalog 失敗時に feature table へフォールバックできる', () => {
		vi.mocked(fgdbRead).mockImplementation((table: ArrayBuffer) => {
			const id = new Uint8Array(table)[0];

			if (id === 1) {
				throw new Error('Start offset 2852126720 is outside the bounds of the buffer');
			}

			if (id === 9) {
				return createFeatureCollection('Polygon');
			}

			throw new Error(`unexpected table id: ${id}`);
		});

		const result = parseFileGdbInputs(
			[
				{
					name: '日本語名.gdb/a00000001.gdbtable',
					data: createBuffer(1)
				},
				{
					name: '日本語名.gdb/a00000001.gdbtablx',
					data: createBuffer(1)
				},
				{
					name: '日本語名.gdb/a00000009.gdbindexes',
					data: createBuffer(99)
				},
				{
					name: '日本語名.gdb/a00000009.spx',
					data: createBuffer(98)
				},
				{
					name: '日本語名.gdb/a00000009.gdbtable',
					data: createBuffer(9)
				},
				{
					name: '日本語名.gdb/a00000009.gdbtablx',
					data: createBuffer(9)
				}
			] satisfies FileGdbInput[]
		);

		expect(result.datasetName).toBe('日本語名');
		expect(result.layers).toHaveLength(1);
		expect(result.layers[0]?.name).toBe('a00000009');
		expect(getFileGdbGeometryTypes(result.layers[0]?.geojson as FeatureCollection)).toEqual([
			'Polygon'
		]);
	});

	it('読めない場合に診断情報を保持する', () => {
		vi.mocked(fgdbRead).mockImplementation((table: ArrayBuffer) => {
			const id = new Uint8Array(table)[0];

			if (id === 1) {
				throw new Error('Start offset 2852126720 is outside the bounds of the buffer');
			}

			if (id === 9) {
				throw new Error('feature table parse failed');
			}

			throw new Error(`unexpected table id: ${id}`);
		});

		try {
			parseFileGdbInputs(
				[
					{
						name: 'sample.gdb/a00000001.gdbtable',
						data: createBuffer(1)
					},
					{
						name: 'sample.gdb/a00000001.gdbtablx',
						data: createBuffer(1)
					},
					{
						name: 'sample.gdb/a00000009.gdbtable',
						data: createBuffer(9)
					},
					{
						name: 'sample.gdb/a00000009.gdbtablx',
						data: createBuffer(9)
					}
				] satisfies FileGdbInput[]
			);

			throw new Error('expected parse to fail');
		} catch (error) {
			expect(error).toBeInstanceOf(FileGdbParseError);

			const parseError = error as FileGdbParseError;
			expect(parseError.message).toBe('feature table parse failed');
			expect(parseError.details.firstError).toBe(
				'Start offset 2852126720 is outside the bounds of the buffer'
			);
			expect(parseError.details.lastError).toBe('feature table parse failed');
			expect(
				parseError.details.events.some((event) => event.message === 'catalog read failed')
			).toBe(
				true
			);
			expect(
				parseError.details.events.some((event) =>
					event.message === 'fallback table read failed'
				)
			).toBe(true);
		}
	});
});
