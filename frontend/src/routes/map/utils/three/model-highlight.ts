import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';
import { createStaticFillPatternImage } from '$routes/map/utils/style/highlight-pattern';
import { DataTexture, DoubleSide, MeshBasicMaterial, RepeatWrapping } from 'three';

/** 2Dと同じ斜線テクスチャを画面座標で重ねる。UVや元のマテリアルは変更しない。 */
export const createModelHighlightMaterial = () => {
	const image = createStaticFillPatternImage(HIGHLIGHT_LAYER_COLOR);
	const texture = new DataTexture(image.data, image.width, image.height);
	texture.wrapS = RepeatWrapping;
	texture.wrapT = RepeatWrapping;
	texture.needsUpdate = true;
	const pixelRatio = { value: 1 };
	const material = new MeshBasicMaterial({
		color: HIGHLIGHT_LAYER_COLOR,
		transparent: true,
		opacity: 1,
		side: DoubleSide,
		depthWrite: false,
		polygonOffset: true,
		polygonOffsetFactor: -1,
		polygonOffsetUnits: -1
	});
	material.onBeforeCompile = shader => {
		shader.uniforms.highlightPattern = { value: texture };
		shader.uniforms.highlightPixelRatio = pixelRatio;
		shader.fragmentShader = `uniform sampler2D highlightPattern;
			uniform float highlightPixelRatio;\n${shader.fragmentShader}`.replace(
			'#include <alphamap_fragment>',
			`#include <alphamap_fragment>
			vec2 highlightUv = vec2(gl_FragCoord.x, -gl_FragCoord.y)
				/ highlightPixelRatio / vec2(${image.width.toFixed(1)}, ${image.height.toFixed(1)});
			diffuseColor.a *= texture2D(highlightPattern, highlightUv).a;`
		);
	};
	material.onBeforeRender = renderer => {
		pixelRatio.value = renderer.getPixelRatio();
	};
	material.customProgramCacheKey = () => 'morivis-selection-pattern-v1';
	material.addEventListener('dispose', () => texture.dispose());
	return material;
};
