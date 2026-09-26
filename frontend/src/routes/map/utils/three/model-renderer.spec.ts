import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestModel } from './__fixtures__/test-model-runtime';
import { ModelRenderer } from './model-renderer';

vi.mock('three', async importOriginal => {
	const actual = await importOriginal<typeof THREE>();
	return {
		...actual,
		WebGLRenderer: class {
			resetState = vi.fn();
			setClearColor = vi.fn();
			setRenderTarget = vi.fn();
			clear = vi.fn();
			dispose = vi.fn();
			getDrawingBufferSize = (target: THREE.Vector2) => target.set(320, 240);
			render = vi.fn();
		}
	};
});
afterEach(() => vi.clearAllMocks());

const initialize = () => {
	const renderer = new ModelRenderer();
	renderer.initialize({} as HTMLCanvasElement, {} as WebGLRenderingContext);
	return renderer;
};
describe('ModelRenderer', () => {
	it('入力行列で通常モデルを描き、地形透過モデルを最後に別バッファで合成する', () => {
		const runtime = initialize();
		const regular = createTestModel('test-regular');
		const overlay = createTestModel('test-overlay');
		overlay.entry.style.showThroughTerrain = true;
		regular.transform.matrix.makeTranslation(2, 3, 4);
		const projection = new THREE.Matrix4().makeScale(2, 2, 2);
		const calls: { visible: string[]; matrix: number[]; scene: THREE.Scene; }[] = [];
		runtime.modelGroup!.add(regular.object, overlay.object);
		vi.mocked(runtime.renderer!.render).mockImplementation((scene, camera) => {
			calls.push({
				visible: [regular, overlay].filter(x => x.object.visible).map(x => x.entry.id),
				matrix: camera.projectionMatrix.toArray(),
				scene: scene as THREE.Scene
			});
		});
		runtime.renderModels(
			new Map([[overlay.entry.id, overlay], [regular.entry.id, regular]]),
			projection,
			240
		);
		expect(calls).toHaveLength(3);
		expect(calls[0].visible).toEqual(['test-regular']);
		expect(calls[0].matrix).toEqual(
			projection.clone().multiply(regular.transform.matrix).toArray()
		);
		expect(calls[1].visible).toEqual(['test-overlay']);
		expect(calls[2].scene).not.toBe(runtime.scene);
		expect(runtime.renderer!.setRenderTarget).toHaveBeenNthCalledWith(
			1,
			expect.any(THREE.WebGLRenderTarget)
		);
		expect(runtime.renderer!.setRenderTarget).toHaveBeenLastCalledWith(null);
		expect(projection.toArray()).toEqual(new THREE.Matrix4().makeScale(2, 2, 2).toArray());
		runtime.dispose();
	});
	it('単体ビューには指定IDの現在の実体だけを出す', () => {
		const runtime = initialize();
		const current = createTestModel();
		const stale = createTestModel();
		const hidden = createTestModel('test-hidden');
		hidden.entry.style.visible = false;
		runtime.modelGroup!.add(current.object, hidden.object);
		runtime.previewModelGroup!.add(stale.object);
		const camera = new THREE.PerspectiveCamera();
		runtime.renderActiveModelView(
			new Map([[current.entry.id, current], [hidden.entry.id, hidden]]),
			{ camera, entryIds: new Set([current.entry.id, hidden.entry.id]) }
		);
		expect(current.object.visible).toBe(true);
		expect(hidden.object.visible).toBe(false);
		expect(stale.object.visible).toBe(false);
		expect(runtime.renderer!.render).toHaveBeenCalledWith(runtime.scene, camera);
		runtime.dispose();
	});
	it('再attachでGPUを作り直さず、dispose後は再初期化できる', () => {
		const runtime = initialize();
		const renderer = runtime.renderer!;
		runtime.initialize({} as HTMLCanvasElement, {} as WebGLRenderingContext);
		expect(runtime.renderer).toBe(renderer);
		runtime.dispose();
		runtime.dispose();
		expect(renderer.dispose).toHaveBeenCalledOnce();
		expect(runtime.initialized).toBe(false);
		expect(runtime.scene).toBeNull();
		runtime.initialize({} as HTMLCanvasElement, {} as WebGLRenderingContext);
		expect(runtime.renderer).not.toBe(renderer);
		runtime.dispose();
	});
});
