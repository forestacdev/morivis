import type { Map as MapLibreMap } from '$routes/map/utils/maplibre';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestModel } from './__fixtures__/test-model-runtime';
import { ThreeJsLayerManager } from './layer-manager';
import type { LoadedModelAsset } from './model-loader';

const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('./model-loader', () => ({
	ModelLoader: class {
		load = load;
		detectSupport = vi.fn();
		dispose = vi.fn();
	},
	loadWebIfcModule: vi.fn()
}));
vi.mock('./model-renderer', async importOriginal => {
	const { ModelRenderer } = await importOriginal<typeof import('./model-renderer')>();
	return {
		ModelRenderer: class extends ModelRenderer {
			initialize = () => {
				this.scene = new THREE.Scene();
				this.camera = new THREE.Camera();
				this.modelGroup = new THREE.Group();
				this.previewModelGroup = new THREE.Group();
				this.scene.add(this.modelGroup, this.previewModelGroup);
				this.renderer = { dispose: vi.fn() } as unknown as THREE.WebGLRenderer;
			};
		}
	};
});
vi.mock('./model-placement-controller', () => ({
	ModelPlacementController: class {
		attach = vi.fn();
		detach = vi.fn();
		dispose = vi.fn();
	}
}));
afterEach(() => vi.clearAllMocks());
const setup = () => {
	const manager = new ThreeJsLayerManager();
	manager.createLayer().onAdd!(
		{
			getCanvas: () => ({}),
			getTerrain: () => null,
			getZoom: () => 10,
			triggerRepaint: vi.fn()
		} as unknown as MapLibreMap,
		{} as WebGL2RenderingContext
	);
	return manager;
};
const deferred = () => {
	let resolve!: (asset: LoadedModelAsset) => void;
	const promise = new Promise<LoadedModelAsset>(done => {
		resolve = done;
	});
	return { promise, resolve };
};
describe('ThreeJsLayerManager の読み込み登録境界', () => {
	it.each(['remove', 'dispose'] as const)(
		'%s 後の読み込み完了を登録せず解放する',
		async action => {
			const pending = deferred();
			load.mockReturnValueOnce(pending.promise);
			const manager = setup();
			const { entry, object } = createTestModel();
			const dispose = vi.spyOn((object.children[0] as THREE.Mesh).geometry, 'dispose');
			const task = manager.addModel(entry);
			if (action === 'remove') manager.removeModel(entry.id);
			else manager.dispose();
			pending.resolve({ object, animations: [] });
			await task;
			expect(manager.modelIds).toEqual([]);
			expect(object.parent).toBeNull();
			expect(dispose).toHaveBeenCalledOnce();
			if (action === 'remove') manager.dispose();
		}
	);
	it('同一IDの新しい読み込みだけを登録する', async () => {
		const oldLoad = deferred();
		const newLoad = deferred();
		load.mockReturnValueOnce(oldLoad.promise).mockReturnValueOnce(newLoad.promise);
		const manager = setup();
		const old = createTestModel();
		const current = createTestModel();
		const oldTask = manager.addModel(old.entry);
		const newTask = manager.addModel(current.entry);
		newLoad.resolve({ object: current.object, animations: [] });
		await newTask;
		oldLoad.resolve({ object: old.object, animations: [] });
		await oldTask;
		expect(manager.modelIds).toEqual([current.entry.id]);
		expect(current.object.parent).not.toBeNull();
		expect(old.object.parent).toBeNull();
		manager.dispose();
	});
	it('プレビュー取消は読み込み途中のmainを取り消さない', async () => {
		const previewLoad = deferred();
		const mainLoad = deferred();
		load.mockReturnValueOnce(previewLoad.promise).mockReturnValueOnce(mainLoad.promise);
		const manager = setup();
		const preview = createTestModel('test-preview');
		const main = createTestModel('test-main');
		const previewTask = manager.addModel(preview.entry, 'preview');
		const mainTask = manager.addModel(main.entry);
		manager.clearPreview();
		previewLoad.resolve({ object: preview.object, animations: [] });
		mainLoad.resolve({ object: main.object, animations: [] });
		await Promise.all([previewTask, mainTask]);
		expect(manager.modelIds).toEqual([main.entry.id]);
		expect(preview.object.parent).toBeNull();
		manager.dispose();
	});
	it('LODも共通ローダーのobjectを受け取り、古いモデルを解放して差し替える', async () => {
		const manager = setup();
		const coarse = createTestModel();
		const detailed = createTestModel();
		coarse.entry.format.lods = [{ maxZoom: 16, url: 'https://example.test/test-coarse.glb' }];
		load.mockResolvedValueOnce({
			object: coarse.object,
			animations: [],
			lodUrl: 'https://example.test/test-coarse.glb'
		});
		await manager.addModel(coarse.entry);
		const parent = coarse.object.parent;
		const dispose = vi.spyOn((coarse.object.children[0] as THREE.Mesh).geometry, 'dispose');
		load.mockResolvedValueOnce({
			object: detailed.object,
			animations: [],
			lodUrl: coarse.entry.format.url
		});
		await manager.loadHighestDetailLod(coarse.entry.id);
		expect(load).toHaveBeenLastCalledWith(coarse.entry, { lodUrl: coarse.entry.format.url });
		expect(detailed.object.parent).toBe(parent);
		expect(coarse.object.parent).toBeNull();
		expect(dispose).toHaveBeenCalledOnce();
		manager.dispose();
	});
});
