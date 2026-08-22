import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreate, mockCreateLazPerf, mockLoadHierarchyPage, mockLoadPointDataView } = vi.hoisted(() => ({
	mockCreate: vi.fn(),
	mockCreateLazPerf: vi.fn(),
	mockLoadHierarchyPage: vi.fn(),
	mockLoadPointDataView: vi.fn()
}));

vi.mock('copc', () => ({
	Copc: {
		create: mockCreate,
		loadHierarchyPage: mockLoadHierarchyPage,
		loadPointDataView: mockLoadPointDataView
	},
	Las: {
		PointData: {
			createLazPerf: mockCreateLazPerf
		}
	}
}));

import { isCopcFileName, parseCopcFile } from './index';

const createMockView = (points: number[][], colors?: number[][]) => ({
	pointCount: points.length,
	dimensions: {
		X: { type: 'float', size: 8 },
		Y: { type: 'float', size: 8 },
		Z: { type: 'float', size: 8 },
		...(colors
			? {
				Red: { type: 'unsigned', size: 2 },
				Green: { type: 'unsigned', size: 2 },
				Blue: { type: 'unsigned', size: 2 }
			}
			: {})
	},
	getter: (name: string) => {
		switch (name) {
			case 'X':
				return (index: number) => points[index][0];
			case 'Y':
				return (index: number) => points[index][1];
			case 'Z':
				return (index: number) => points[index][2];
			case 'Red':
				return (index: number) => colors?.[index]?.[0] ?? 255;
			case 'Green':
				return (index: number) => colors?.[index]?.[1] ?? 255;
			case 'Blue':
				return (index: number) => colors?.[index]?.[2] ?? 255;
			default:
				throw new Error(`unexpected getter: ${name}`);
		}
	}
});

describe('COPC parser', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockCreateLazPerf.mockResolvedValue({ ready: true });
		mockCreate.mockResolvedValue({
			header: {
				pointCount: 10,
				pointDataRecordFormat: 7,
				min: [140, 35, 0],
				max: [141, 36, 10]
			},
			info: {
				rootHierarchyPage: { pageOffset: 128, pageLength: 64 }
			}
		});
		mockLoadHierarchyPage
			.mockResolvedValueOnce({
				nodes: {
					'0-0-0-0': {
						pointCount: 4,
						pointDataOffset: 10,
						pointDataLength: 20
					}
				},
				pages: {
					'1-0-0-0': {
						pageOffset: 256,
						pageLength: 64
					}
				}
			})
			.mockResolvedValueOnce({
				nodes: {
					'1-0-0-0': {
						pointCount: 6,
						pointDataOffset: 30,
						pointDataLength: 40
					}
				},
				pages: {}
			});
		mockLoadPointDataView.mockImplementation(async (_getter, _copc, node) => {
			if (node.pointDataOffset === 10) {
				return createMockView(
					[
						[140.0, 35.0, 1],
						[140.1, 35.1, 2],
						[140.2, 35.2, 3],
						[140.3, 35.3, 4]
					],
					[
						[256, 512, 768],
						[1024, 1280, 1536],
						[1792, 2048, 2304],
						[2560, 2816, 3072]
					]
				);
			}

			return createMockView(
				[
					[140.4, 35.4, 5],
					[140.5, 35.5, 6],
					[140.6, 35.6, 7],
					[140.7, 35.7, 8],
					[140.8, 35.8, 9],
					[140.9, 35.9, 10]
				],
				[
					[3328, 3584, 3840],
					[4096, 4352, 4608],
					[4864, 5120, 5376],
					[5632, 5888, 6144],
					[6400, 6656, 6912],
					[7168, 7424, 7680]
				]
			);
		});
	});

	it('`.copc.laz` を COPC と判定する', () => {
		expect(isCopcFileName('sample.copc.laz')).toBe(true);
		expect(isCopcFileName('sample.laz')).toBe(false);
	});

	it('浅いノード優先で COPC をサンプリングする', async () => {
		const file = new File([new Uint8Array(1024)], 'sample.copc.laz', {
			type: 'application/octet-stream'
		});

		const result = await parseCopcFile(file, 5);

		expect(result.pointCount).toBe(5);
		expect(result.sourcePointCount).toBe(10);
		expect(result.isSampled).toBe(true);
		expect(result.bbox).toEqual([140, 35, 141, 36]);
		expect(Array.from(result.positions)).toEqual([
			140,
			35,
			1,
			140.10000610351562,
			35.099998474121094,
			2,
			140.1999969482422,
			35.20000076293945,
			3,
			140.3000030517578,
			35.29999923706055,
			4,
			140.39999389648438,
			35.400001525878906,
			5
		]);
		expect(Array.from(result.colors ?? [])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
		expect(mockCreateLazPerf).toHaveBeenCalledWith({
			locateFile: expect.any(Function)
		});

		const createLazPerfOptions = mockCreateLazPerf.mock.calls[0]?.[0];
		expect(createLazPerfOptions?.locateFile('laz-perf.wasm')).toMatch(
			/\/vendor\/laz-perf\/laz-perf\.wasm$/
		);

		expect(mockLoadHierarchyPage).toHaveBeenCalledTimes(2);
		expect(mockLoadPointDataView).toHaveBeenCalledTimes(2);
		for (const call of mockLoadPointDataView.mock.calls) {
			expect(call[3]).toEqual(
				expect.objectContaining({
					lazPerf: { ready: true }
				})
			);
		}
	});
});
