import { describe, expect, it } from 'vitest';

import { resolveMeshEdgeUniforms } from './model-edge';

describe('resolveMeshEdgeUniforms', () => {
	it('設定がなければエッジ表示を無効にする', () => {
		const uniforms = resolveMeshEdgeUniforms({});

		expect(uniforms.enabled).toBe(false);
		expect(uniforms.color.getHexString()).toBe('191919');
		expect(uniforms.thickness).toBe(0.001);
		expect(uniforms.opacity).toBe(1);
	});

	it('指定した色と太さをuniform値に変換する', () => {
		const uniforms = resolveMeshEdgeUniforms({
			edge: { enabled: true, color: '#f43f5e', thickness: 2.5 }
		});

		expect(uniforms.enabled).toBe(true);
		expect(uniforms.color.getHexString()).toBe('f43f5e');
		expect(uniforms.thickness).toBe(2.5);
		expect(uniforms.opacity).toBe(1);
	});
});
