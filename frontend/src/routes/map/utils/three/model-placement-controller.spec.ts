import type { Map as MapLibreMap } from '$routes/map/utils/maplibre';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestModel } from './__fixtures__/test-model-runtime';
import { buildMercatorModelMatrix } from './mercator-model-matrix';
import { ModelPlacementController } from './model-placement-controller';

// WebGL/ブラウザの代わりに最小限のDOM境界を置く。変換・当たり判定・イベント処理は実装を使う。
class TestElement extends EventTarget {
	style: Record<string, string> = { cursor: 'default' };
	captured = new Set<number>();
	clientWidth = 200;
	clientHeight = 200;
	getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 });
	setPointerCapture = (id: number) => {
		this.captured.add(id);
	};
	hasPointerCapture = (id: number) => this.captured.has(id);
	releasePointerCapture = (id: number) => {
		this.captured.delete(id);
	};
	remove = vi.fn();
	replaceChildren = vi.fn();
	appendChild = vi.fn();
}
vi.mock('three/addons/renderers/CSS2DRenderer.js', async () => {
	const { Object3D } = await import('three');
	return {
		CSS2DRenderer: class {
			domElement = new TestElement();
			setSize = vi.fn();
			render = vi.fn();
		},
		CSS2DObject: class extends Object3D {
			constructor(public element: TestElement) {
				super();
			}
		}
	};
});
afterEach(() => vi.unstubAllGlobals());
const pointer = (target: TestElement, type: string, x = 100, y = 100) => {
	const event = new Event(type, { cancelable: true });
	Object.assign(event, { pointerId: 1, button: 0, clientX: x, clientY: y });
	target.dispatchEvent(event);
};
const setup = () => {
	const canvas = new TestElement();
	const container = new TestElement();
	const map = {
		getCanvas: () => canvas,
		getCanvasContainer: () => container,
		getTerrain: () => null,
		project: () => ({ x: 100, y: 100 }),
		unproject: ([x, y]: number[]) => ({ lng: x, lat: y }),
		dragPan: { isEnabled: () => true, disable: vi.fn(), enable: vi.fn() },
		triggerRepaint: vi.fn()
	};
	const { entry } = createTestModel();
	entry.format.localBounds = [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5];
	const scene = new THREE.Scene();
	const change = vi.fn();
	const options = { isModelViewActive: () => false, onModelTransform: vi.fn() };
	const controller = new ModelPlacementController(options);
	controller.attach(map as unknown as MapLibreMap, scene, new THREE.Camera());
	controller.setPlacementTransformChangeHandler(change);
	controller.setPlacementPreview(entry, entry.style, { showTransformHandles: false });
	controller.setProjection(buildMercatorModelMatrix(entry.style.transform, false).invert());
	return { controller, canvas, container, map, entry, scene, change, options };
};
describe('ModelPlacementController', () => {
	it('移動量をcallbackへ返し、detachでpointer captureと地図パンを戻す', () => {
		const { controller, canvas, map, scene, change } = setup();
		pointer(canvas, 'pointerdown');
		expect(canvas.hasPointerCapture(1)).toBe(true);
		expect(map.dragPan.disable).toHaveBeenCalledOnce();
		pointer(canvas, 'pointermove', 110, 120);
		expect(change).toHaveBeenCalledWith(expect.objectContaining({ lng: 110, lat: 120 }));
		controller.detach();
		expect(canvas.hasPointerCapture(1)).toBe(false);
		expect(canvas.style.cursor).toBe('default');
		expect(map.dragPan.enable).toHaveBeenCalledOnce();
		expect(controller.hasPreview).toBe(false);
		expect(scene.children).toHaveLength(0);
		pointer(canvas, 'pointermove', 140, 150);
		expect(change).toHaveBeenCalledOnce();
	});
	it('単体ビュー中は配置ドラッグを始めない', () => {
		const { controller, canvas, map, options } = setup();
		options.isModelViewActive = () => true;
		pointer(canvas, 'pointerdown');
		expect(canvas.hasPointerCapture(1)).toBe(false);
		expect(map.dragPan.disable).not.toHaveBeenCalled();
		controller.dispose();
	});
	it('拡縮ハンドルをドラッグ中にプレビューを消してもcaptureを解放する', () => {
		const { controller, entry, scene } = setup();
		vi.stubGlobal('document', { createElement: () => new TestElement() });
		controller.setPlacementPreview(entry);
		const handles = scene.children.find(child =>
			child.children.some(handle => handle.name.startsWith('model-placement-scale-'))
		)!;
		const button = (handles.children[0] as THREE.Object3D & { element: TestElement; }).element;
		pointer(button, 'pointerdown');
		expect(button.hasPointerCapture(1)).toBe(true);
		controller.clearPlacementPreview();
		expect(button.hasPointerCapture(1)).toBe(false);
		expect(scene.children).toHaveLength(0);
		controller.dispose();
	});
});
