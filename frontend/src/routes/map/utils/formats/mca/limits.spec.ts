import { describe, expect, it } from 'vitest';
import { mcaToGlb } from '.';
import { regionFixture } from './__fixtures__/region';
import { mcaFilesToGlb } from './batch-convert';
import { DEFAULT_MCA_MAX_FACES, resolveMcaMaxFaces } from './limits';

describe('MCA面数上限', () => {
	it('既定では面数による上限を設けない', () => {
		expect(DEFAULT_MCA_MAX_FACES).toBe(0);
		expect(resolveMcaMaxFaces()).toBe(Infinity);
	});

	it.each([-1, 0.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
		'不正な上限を単体・一括双方の入口で拒否する: %s',
		async maxFaces => {
			await expect(mcaToGlb(regionFixture(), { maxFaces })).rejects.toThrow('面数上限');
			await expect(mcaFilesToGlb([new File([regionFixture()], 'r.0.0.mca')], { maxFaces }))
				.rejects.toThrow('面数上限');
		}
	);
	it.each([5_000_001, 10_000_000, 0])(
		'500万面超・制限なしを単体と一括変換に渡せる: %s',
		async maxFaces => {
			expect(resolveMcaMaxFaces(maxFaces)).toBe(maxFaces === 0 ? Infinity : maxFaces);
			await expect(mcaToGlb(regionFixture(), { maxFaces })).resolves.toMatchObject({
				faceCount: 6
			});
			await expect(mcaFilesToGlb([new File([regionFixture()], 'r.0.0.mca')], { maxFaces }))
				.resolves.toMatchObject({ faceCount: 6 });
		}
	);
	it('単体変換にも指定上限を適用し、上限ちょうどまで許可する', async () => {
		await expect(mcaToGlb(regionFixture(), { maxFaces: 5 })).rejects.toThrow('面数上限（5面）');
		await expect(mcaToGlb(regionFixture(), { maxFaces: 6 })).resolves.toMatchObject({
			faceCount: 6
		});
	});
});
