import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspectVrmlFile, parseVrmlText } from './index';

const source = readFileSync(new URL('./__fixtures__/test-textured.wrl', import.meta.url), 'utf8');

afterEach(() => vi.restoreAllMocks());

describe('VRML', () => {
	it('コメントを除き、Loaderが使用する参照画像を取得する', async () => {
		const result = await inspectVrmlFile(new File([source], 'test-model.wrl'));
		expect(result.referencedTexturePaths).toEqual(['textures/test-grid.png']);
	});

	it('BOMとスカラーURLを扱い、引用符内のコメント記号や括弧を保持する', async () => {
		const text = '\uFEFF' + source.replace(
			'[ "textures/test-grid.png" "test-fallback.png" ]',
			'"test-{grid}#1.png"'
		);
		expect((await inspectVrmlFile(new File([text], 'test-model.vrml'))).referencedTexturePaths)
			.toEqual(['test-{grid}#1.png']);
		const object = await parseVrmlText(text, { skipTextures: true });
		expect(new THREE.Box3().setFromObject(object).isEmpty()).toBe(false);
	});

	it('Workerで画像を読み込まず、階層の変換と形状を解析する', async () => {
		const load = vi.spyOn(THREE.TextureLoader.prototype, 'load');
		const object = await parseVrmlText(source, { skipTextures: true });
		const box = new THREE.Box3().setFromObject(object);
		expect(load).not.toHaveBeenCalled();
		expect(box.min.toArray()).toEqual([10, 20, 30]);
		expect(box.max.toArray()).toEqual([12, 23, 30]);
	});

	it('同梱画像のURLを解決し、UVとTextureTransformを保持する', async () => {
		const manager = new THREE.LoadingManager();
		const load = vi.spyOn(THREE.TextureLoader.prototype, 'load')
			.mockReturnValue(new THREE.Texture());
		const object = await parseVrmlText(source, {
			manager,
			resourceUrls: { 'textures/test-grid.png': 'blob:test-grid' }
		});
		expect(load).toHaveBeenCalledWith('textures/test-grid.png');
		expect(manager.resolveURL('./Textures/test-grid.png')).toBe('blob:test-grid');
		let mesh: THREE.Mesh | undefined;
		object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) mesh = child as THREE.Mesh;
		});
		const material = mesh!.material as THREE.MeshPhongMaterial;
		expect(material.map?.repeat.toArray()).toEqual([1, -1]);
		expect(material.map?.wrapS).toBe(THREE.ClampToEdgeWrapping);
		expect(material.map?.colorSpace).toBe(THREE.SRGBColorSpace);
		expect(Array.from(mesh!.geometry.getAttribute('uv').array).every(Number.isFinite)).toBe(
			true
		);
	});

	it('空のTextureCoordinateから生成された不正UVを除去する', async () => {
		const object = await parseVrmlText(source.replace('point [ 0 0, 1 0, 0 1 ]', 'point []'), {
			skipTextures: true
		});
		object.traverse((child) => {
			if ((child as THREE.Mesh).isMesh) {
				expect((child as THREE.Mesh).geometry.getAttribute('uv')).toBeUndefined();
			}
		});
	});

	it.each([
		['', 'VRMLファイルが空です'],
		['#VRML V1.0 ascii\nSeparator {}', 'VRML 2.0'],
		['#VRML V2.0 utf8\nGroup {}', '描画できる形状がありません'],
		['#VRML V2.0 utf8\nShape {', '解析できませんでした']
	])('空・非対応・破損データをエラーにする (%s)', async (text, error) => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(parseVrmlText(text, { skipTextures: true })).rejects.toThrow(error);
	});
});
