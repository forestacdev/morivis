import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';
import { createStaticFillPatternImage } from '$routes/map/utils/style/highlight-pattern';
import { DataTexture, ShaderLib, UniformsUtils, type WebGLRenderer } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createModelHighlightMaterial } from './model-highlight';

const prepareMaterial = () => {
	const material = createModelHighlightMaterial();
	const shader = {
		vertexShader: ShaderLib.basic.vertexShader,
		fragmentShader: ShaderLib.basic.fragmentShader,
		uniforms: UniformsUtils.clone(ShaderLib.basic.uniforms)
	};
	material.onBeforeCompile(
		shader as Parameters<typeof material.onBeforeCompile>[0],
		{} as WebGLRenderer
	);
	return { material, shader, texture: shader.uniforms.highlightPattern.value as DataTexture };
};

describe('3Dモデルの選択テクスチャ', () => {
	it('2Dと同じRGBA画像を使用し、元のモデルのUVを要求しない', () => {
		const { material, shader, texture } = prepareMaterial();
		const image = createStaticFillPatternImage(HIGHLIGHT_LAYER_COLOR);
		expect(texture.image).toMatchObject(image);
		expect(shader.vertexShader).toBe(ShaderLib.basic.vertexShader);
		expect(material.map).toBeNull();
		expect(material.depthWrite).toBe(false);
		material.dispose();
	});
	it('選択解除でマテリアルを破棄すると、テクスチャも解放する', () => {
		const { material, texture } = prepareMaterial();
		const disposed = vi.fn();
		texture.addEventListener('dispose', disposed);
		material.dispose();
		expect(disposed).toHaveBeenCalledOnce();
	});
});
