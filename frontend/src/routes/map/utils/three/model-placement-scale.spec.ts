import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import {
	getModelScaleFromHandleDrag,
	getModelScaleHandles,
	getOppositeModelScaleHandle,
	preserveModelLocalPointPosition
} from '$routes/map/utils/three/model-placement-scale';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

const localBounds = [-10, -8, -6, 10, 8, 12] as const;
const startTransform = {
	lng: 0,
	lat: 0,
	altitude: 20,
	heightOffset: 0,
	baseScale: 1,
	scale: 1,
	rotationX: 0,
	rotationY: 0,
	rotationZ: 0
};

describe('model placement scale', () => {
	it('立体範囲の8頂点にハンドルを作る', () => {
		const handles = getModelScaleHandles([...localBounds]);

		expect(handles).toHaveLength(8);
		expect(new Set(handles.map(({ key }) => key)).size).toBe(8);
		expect(handles.map(({ position }) => position)).toContainEqual([-10, -8, -6]);
		expect(handles.map(({ position }) => position)).toContainEqual([10, 8, 12]);
		expect(getOppositeModelScaleHandle([...localBounds], 'min-min-max')).toEqual({
			key: 'max-max-min',
			position: [10, 8, -6]
		});
	});

	it('拡縮と回転後も対角頂点の3D位置を固定する', () => {
		const fixedLocalPosition: [number, number, number] = [10, 8, 12];
		const nextTransform = preserveModelLocalPointPosition({
			fixedLocalPosition,
			startTransform,
			nextTransform: {
				...startTransform,
				scale: 2.5,
				rotationY: 35
			},
			terrainEnabled: true
		});
		const startWorld = new THREE.Vector3(...fixedLocalPosition).applyMatrix4(
			buildMercatorModelMatrix(startTransform, true)
		);
		const nextWorld = new THREE.Vector3(...fixedLocalPosition).applyMatrix4(
			buildMercatorModelMatrix(nextTransform, true)
		);

		expect(nextWorld.distanceTo(startWorld)).toBeLessThan(1e-12);
	});

	it('地形なしでも高さオフセットを使って対角頂点を固定する', () => {
		const fixedLocalPosition: [number, number, number] = [-10, -8, -6];
		const nextTransform = preserveModelLocalPointPosition({
			fixedLocalPosition,
			startTransform,
			nextTransform: {
				...startTransform,
				scale: 0.5,
				rotationY: -20
			},
			terrainEnabled: false
		});
		const startWorld = new THREE.Vector3(...fixedLocalPosition).applyMatrix4(
			buildMercatorModelMatrix(startTransform, false)
		);
		const nextWorld = new THREE.Vector3(...fixedLocalPosition).applyMatrix4(
			buildMercatorModelMatrix(nextTransform, false)
		);

		expect(nextWorld.distanceTo(startWorld)).toBeLessThan(1e-12);
		expect(nextTransform.heightOffset).not.toBe(0);
	});

	it('画面上のドラッグ距離に応じた一様スケールを返す', () => {
		expect(
			getModelScaleFromHandleDrag({
				currentDistance: 200,
				startDistance: 100,
				startScale: 1
			})
		).toBe(2);
	});

	it('倍率へ上下限を設けない', () => {
		expect(
			getModelScaleFromHandleDrag({
				currentDistance: 0.000_001,
				startDistance: 1,
				startScale: 2
			})
		).toBe(0.000_002);
		expect(
			getModelScaleFromHandleDrag({
				currentDistance: 1_000_000,
				startDistance: 1,
				startScale: 2
			})
		).toBe(2_000_000);
	});
});
