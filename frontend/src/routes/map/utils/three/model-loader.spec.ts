import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { type GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestModel } from './__fixtures__/test-model-runtime';
import { ModelLoader } from './model-loader';

afterEach(() => vi.restoreAllMocks());

describe('ModelLoader', () => {
	it('明示されたLODを読み込み、シーン登録や材質変更なしでアニメーションと返す', async () => {
		const { entry, object } = createTestModel();
		const animation = new THREE.AnimationClip('test-motion', 1, []);
		const mesh = object.children[0] as THREE.Mesh;
		const material = mesh.material;
		const load = vi.spyOn(GLTFLoader.prototype, 'load').mockImplementation((_url, onLoad) => {
			onLoad({ scene: object, animations: [animation] } as GLTF);
		});
		const loader = new ModelLoader();
		const result = await loader.load(entry, { lodUrl: 'https://example.test/test-coarse.glb' });
		expect(load.mock.calls[0][0]).toBe('https://example.test/test-coarse.glb');
		expect(result.object).toBe(object);
		expect(result.animations).toEqual([animation]);
		expect(result.lodUrl).toBe('https://example.test/test-coarse.glb');
		expect(object.parent).toBeNull();
		expect(mesh.material).toBe(material);
		expect(entry.state?.animation).toBeUndefined();
		loader.dispose();
	});
	it('取得失敗を呼出元へ返す', async () => {
		const failure = new Error('test loading failure');
		vi.spyOn(GLTFLoader.prototype, 'load').mockImplementation(
			(_url, _onLoad, _progress, onError) => {
				onError?.(failure);
			}
		);
		const loader = new ModelLoader();
		await expect(loader.load(createTestModel().entry)).rejects.toBe(failure);
		loader.dispose();
	});
	it('デコーダーとテクスチャ変換Workerの両方を解放する', () => {
		const draco = vi.spyOn(DRACOLoader.prototype, 'dispose');
		const ktx = vi.spyOn(KTX2Loader.prototype, 'dispose');
		new ModelLoader().dispose();
		expect(draco).toHaveBeenCalledOnce();
		expect(ktx).toHaveBeenCalledOnce();
	});
});
