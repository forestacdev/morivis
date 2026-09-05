import { describe, expect, it } from 'vitest';

import * as THREE from 'three';

import { createPlacementPreviewObject } from './placement-preview';

describe('createPlacementPreviewObject', () => {
	it('2Dの座標選択と同じ赤い斜線テクスチャと白い外周線を作る', () => {
		const preview = createPlacementPreviewObject([-5, -4, 0, 5, 4, 8]);
		const surface = preview.children.find((child): child is THREE.Mesh =>
			child instanceof THREE.Mesh
		);
		const edges = preview.children.find(
			(child): child is THREE.LineSegments => child instanceof THREE.LineSegments
		);

		expect(surface?.material).toBeInstanceOf(THREE.MeshBasicMaterial);
		expect((surface?.material as THREE.MeshBasicMaterial).map).toBeInstanceOf(
			THREE.DataTexture
		);
		expect((surface?.material as THREE.MeshBasicMaterial).depthWrite).toBe(false);
		expect((edges?.material as THREE.LineBasicMaterial).color.getHex()).toBe(0xffffff);
	});
});
