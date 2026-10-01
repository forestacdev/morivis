import type { Map as MapLibreMap } from '$routes/map/utils/maplibre';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createTestModel } from './__fixtures__/test-model-runtime';
import { ModelInteractionController } from './model-interaction-controller';
import { ModelRenderer } from './model-renderer';

describe('ModelInteractionController', () => {
	it('単体ビューの軸補正と床を閉じる際に取り除き、配置と表示状態を戻す', () => {
		const loaded = createTestModel();
		loaded.entry.format.type = 'fbx';
		loaded.entry.style.transform.baseRotationX = 90;
		const runtime = new ModelRenderer();
		runtime.scene = new THREE.Scene();
		runtime.modelGroup = new THREE.Group();
		runtime.previewModelGroup = new THREE.Group();
		runtime.renderer = {} as THREE.WebGLRenderer;
		runtime.scene.add(runtime.modelGroup, runtime.previewModelGroup);
		runtime.modelGroup.add(loaded.object);
		runtime.modelGroup.visible = false;
		const canvas = { clientWidth: 320, clientHeight: 240 };
		const repaint = vi.fn();
		const controller = new ModelInteractionController(
			runtime,
			new Map([[loaded.entry.id, loaded]])
		);
		controller.attach(
			{
				getCanvas: () => canvas,
				getContainer: () => canvas,
				resize: vi.fn(),
				triggerRepaint: repaint
			} as unknown as MapLibreMap
		);
		const position = loaded.object.position.clone();
		const session = controller.openModelView([loaded.entry.id]);
		expect(session).not.toBeNull();
		expect(controller.view?.entryIds.has(loaded.entry.id)).toBe(true);
		expect(loaded.object.parent).not.toBe(runtime.modelGroup);
		const floor = runtime.scene.children.find(child =>
			child instanceof THREE.GridHelper
		) as THREE.GridHelper;
		const dispose = vi.spyOn(floor, 'dispose');
		controller.detach();
		controller.detach();
		expect(controller.view).toBeNull();
		expect(loaded.object.parent).toBe(runtime.modelGroup);
		expect(loaded.object.position).toEqual(position);
		expect(runtime.modelGroup.visible).toBe(false);
		expect(dispose).toHaveBeenCalledOnce();
		expect(runtime.scene.children).toHaveLength(2);
	});
	it('未登録のIDではビューを開始しない', () => {
		const controller = new ModelInteractionController(new ModelRenderer(), new Map());
		expect(controller.openModelView(['test-missing'])).toBeNull();
	});
});
