import { describe, expect, it } from 'vitest';
import { FORMAT_DEFINITIONS } from './registry';
import { checkInputResourceLimits, MiB } from './resource-limits';

const file = (name: string, size: number) => ({ name, size });

describe('input resource limits', () => {
	it('ファイル・一式・読み込み全体の上限を区別し、上限ちょうどは許可する', () => {
		const datasets = [
			{ name: 'test-a', files: [file('test-a.shp', 6), file('test-a.dbf', 4)] },
			{ name: 'test-b', files: [file('test-b.shp', 6)] }
		];
		expect(
			checkInputResourceLimits(datasets, {
				maxFileBytes: 6,
				maxDatasetBytes: 10,
				maxBatchBytes: 16
			})
		).toBeNull();
		expect(checkInputResourceLimits(datasets, { maxFileBytes: 5 })).toMatchObject({
			scope: 'file',
			actual: 6
		});
		expect(checkInputResourceLimits(datasets, { maxDatasetBytes: 9 })).toMatchObject({
			scope: 'dataset',
			name: 'test-a',
			actual: 10
		});
		expect(checkInputResourceLimits(datasets, { maxBatchBytes: 15 })).toMatchObject({
			scope: 'batch',
			actual: 16
		});
	});
	it('同じファイルの参照を二重計上しない', () => {
		const member = file('test.shp', 6);
		expect(
			checkInputResourceLimits([{ name: 'test', files: [member, member] }], {
				maxFiles: 1,
				maxDatasetBytes: 6,
				maxBatchBytes: 6
			})
		).toBeNull();
	});
	it('BDSとGCDは複数ファイルの合計で拒否する', () => {
		for (const key of ['bds', 'gcd'] as const) {
			const size = FORMAT_DEFINITIONS[key].limits.maxBatchBytes / 2;
			const datasets = [0, 1].map(index => ({
				name: `test-${index}`,
				files: [file(`test-${index}.${key}`, size)]
			}));
			expect(checkInputResourceLimits(datasets, FORMAT_DEFINITIONS[key].limits)).toBeNull();
			datasets[1].files[0].size += 1;
			expect(checkInputResourceLimits(datasets, FORMAT_DEFINITIONS[key].limits))
				.toMatchObject({
					scope: 'batch'
				});
		}
	});
	it('Shapefileには新しい強制容量上限を追加しない', () => {
		expect(
			checkInputResourceLimits(
				[{ name: 'test', files: [file('test.shp', 512 * MiB)] }],
				FORMAT_DEFINITIONS.shp.limits
			)
		).toBeNull();
	});
	it('ファイル数と容量を別々に検査する', () => {
		const datasets = [{
			name: 'test',
			files: Array.from({ length: 33 }, (_, i) => file(`test-${i}.bds`, 1))
		}];
		expect(checkInputResourceLimits(datasets, FORMAT_DEFINITIONS.bds.limits)).toMatchObject({
			scope: 'file-count',
			actual: 33,
			limit: 32
		});
	});
});
