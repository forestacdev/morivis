import { describe, expect, it } from 'vitest';

import {
	getTextureOptimizationOutputPath,
	parseTextureOptimizationArguments,
	TEXTURE_OPTIMIZATION_DEFAULTS
} from './optimize-glb-textures';

describe('optimize-glb-textures', () => {
	it('既定の出力先と画質を決定する', () => {
		const options = parseTextureOptimizationArguments(['test-model.glb'], '/workspace');

		expect(options).toEqual({
			inputPath: '/workspace/test-model.glb',
			outputPath: '/workspace/test-model.webp.glb',
			quality: TEXTURE_OPTIMIZATION_DEFAULTS.quality
		});
		expect(getTextureOptimizationOutputPath('/workspace/test-model.glb')).toBe(
			'/workspace/test-model.webp.glb'
		);
	});

	it('画質と出力先を指定できる', () => {
		const options = parseTextureOptimizationArguments(
			['test-model.glb', '--quality', '72', '--output', 'optimized/output.glb'],
			'/workspace'
		);

		expect(options).toEqual({
			inputPath: '/workspace/test-model.glb',
			outputPath: '/workspace/optimized/output.glb',
			quality: 72
		});
	});

	it('不正な入力と上書きを拒否する', () => {
		expect(() => parseTextureOptimizationArguments(['test-model.gltf'], '/workspace')).toThrow(
			'入力は .glb ファイルにしてください。'
		);
		expect(() =>
			parseTextureOptimizationArguments(['test-model.glb', '--quality', '101'], '/workspace')
		).toThrow('--quality は 1 から 100 の整数を指定してください。');
		expect(() =>
			parseTextureOptimizationArguments(
				['test-model.glb', '--output', 'test-model.glb'],
				'/workspace'
			)
		).toThrow('入力ファイルを上書きできません。');
	});
});
