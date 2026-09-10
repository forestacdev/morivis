import { describe, expect, it } from 'vitest';

import { DEFAULT_MESH_SHADING } from '$routes/map/data/types/model';

import { resolveMeshShadingUniforms } from './model-shading';

describe('resolveMeshShadingUniforms', () => {
	it('陰影を無効にするとフラットなuniform値を返す', () => {
		const uniforms = resolveMeshShadingUniforms({
			shading: { ...DEFAULT_MESH_SHADING, enabled: false }
		});

		expect(uniforms.ambientStrength).toBe(1);
		expect(uniforms.shadeStrength).toBe(0);
	});

	it('陰影を有効にすると指定した光量を返す', () => {
		const uniforms = resolveMeshShadingUniforms({
			shading: {
				...DEFAULT_MESH_SHADING,
				enabled: true,
				ambientStrength: 0.4,
				shadeStrength: 0.9
			}
		});

		expect(uniforms.ambientStrength).toBe(0.4);
		expect(uniforms.shadeStrength).toBe(0.9);
		expect(uniforms.lightDirection.length()).toBeCloseTo(1);
	});
});
