import { describe, expect, it } from 'vitest';

import { resolveFbxTextureFile } from './fbx-textures';

describe('resolveFbxTextureFile', () => {
	it('接尾番号を持つマテリアルに対応する画像を選ぶ', () => {
		expect(resolveFbxTextureFile('test-body-02', ['test-body.png', 'test-face.png'])).toBe(
			'test-body.png'
		);
	});

	it('候補が同順位なら画像を割り当てない', () => {
		expect(resolveFbxTextureFile('test-part', ['test-part-a.png', 'test-part-b.png'])).toBeUndefined();
	});
});
