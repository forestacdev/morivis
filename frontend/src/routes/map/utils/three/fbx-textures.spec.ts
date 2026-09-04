import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { configureFbxFallbackTexture, resolveFbxTextureFile } from './fbx-textures';

describe('resolveFbxTextureFile', () => {
	it('接尾番号を持つマテリアルに対応する画像を選ぶ', () => {
		expect(resolveFbxTextureFile('test-body-02', ['test-body.png', 'test-face.png'])).toBe(
			'test-body.png'
		);
	});

	it('候補が同順位なら画像を割り当てない', () => {
		expect(resolveFbxTextureFile('test-part', ['test-part-a.png', 'test-part-b.png'])).toBeUndefined();
	});

	it('短い画像名の部分一致では無関係なマテリアルへ割り当てない', () => {
		expect(resolveFbxTextureFile('test-outline-material', ['st.png'])).toBeUndefined();
	});

	it('フォールバック画像は FBX の UV 座標を反転しない', () => {
		const texture = new THREE.Texture();

		configureFbxFallbackTexture(texture);

		expect(texture.flipY).toBe(false);
		expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
	});
});
