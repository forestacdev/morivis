import { describe, expect, it } from 'vitest';

import { getLodOutputPaths, LOD_DEFAULTS, parseLodArguments } from './generate-model-lods';

describe('generate-model-lods', () => {
	it('既定の比率と入力名から medium / low の出力先を決定する', () => {
		const options = parseLodArguments(['test-model.glb'], '/workspace');

		expect(options).toEqual({
			error: LOD_DEFAULTS.error,
			inputPath: '/workspace/test-model.glb',
			lowRatio: LOD_DEFAULTS.lowRatio,
			lowTextureSize: LOD_DEFAULTS.lowTextureSize,
			mediumRatio: LOD_DEFAULTS.mediumRatio,
			mediumTextureSize: LOD_DEFAULTS.mediumTextureSize,
			outputDirectory: '/workspace',
			textureQuality: LOD_DEFAULTS.textureQuality
		});
		expect(getLodOutputPaths(options!)).toEqual({
			low: '/workspace/test-model.low.glb',
			medium: '/workspace/test-model.medium.glb'
		});
	});

	it('出力先と簡略化率を指定できる', () => {
		const options = parseLodArguments(
			[
				'test-model.glb',
				'--out-dir',
				'lod',
				'--medium-ratio',
				'0.6',
				'--low-ratio',
				'0.2',
				'--medium-texture-size',
				'2048',
				'--low-texture-size',
				'256',
				'--texture-quality',
				'75',
				'--error',
				'0.01'
			],
			'/workspace'
		);

		expect(options).toMatchObject({
			error: 0.01,
			lowRatio: 0.2,
			lowTextureSize: 256,
			mediumRatio: 0.6,
			mediumTextureSize: 2048,
			outputDirectory: '/workspace/lod',
			textureQuality: 75
		});
	});

	it('low が medium 以上の比率は拒否する', () => {
		expect(() =>
			parseLodArguments(
				['test-model.glb', '--medium-ratio', '0.2', '--low-ratio', '0.2'],
				'/workspace'
			)
		).toThrow('--low-ratio は --medium-ratio より小さくしてください。');
	});
});
