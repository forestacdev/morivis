import type { ModelLocalBounds, ModelTransformStyle } from '$routes/map/data/types/model';
import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import { MercatorCoordinate } from 'maplibre-gl';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { getModelFocusView } from './focus-model';

const style: ModelTransformStyle = {
	transform: {
		lng: 0,
		lat: 0,
		altitude: 0,
		scale: 1,
		rotationX: 0,
		rotationY: 0,
		rotationZ: 0
	}
};
const viewport = {
	width: 800,
	height: 600,
	fov: 36.87,
	bearing: 0,
	pitch: 60,
	terrainEnabled: false,
	centerElevation: 0
};
const humanoid: ModelLocalBounds = [-0.3, 0, -0.2, 0.3, 2, 0.2];

describe('getModelFocusView', () => {
	it.each([
		{ width: 800, height: 600, bearing: 0 },
		{ width: 390, height: 700, bearing: 125 }
	])('人型の足元から頭まで画面内に収める: %o', (screen) => {
		const options = { ...viewport, ...screen };
		const view = getModelFocusView(humanoid, style, options)!;
		const camera = new PerspectiveCamera(
			options.fov,
			options.width / options.height,
			1e-12,
			10
		);
		camera.position.copy(view.position);
		camera.up.set(0, 0, 1);
		camera.lookAt(view.target);
		camera.updateMatrixWorld();
		const matrix = buildMercatorModelMatrix(style.transform, false);
		for (const x of [humanoid[0], humanoid[3]]) {
			for (const y of [humanoid[1], humanoid[4]]) {
				for (const z of [humanoid[2], humanoid[5]]) {
					const projected = new Vector3(x, y, z).applyMatrix4(matrix).project(camera);
					expect(Math.abs(projected.x)).toBeLessThan(0.8);
					expect(Math.abs(projected.y)).toBeLessThan(0.8);
					expect(projected.z).toBeGreaterThan(-1);
					expect(projected.z).toBeLessThan(1);
				}
			}
		}
		const torso = new Vector3(0, 1, 0).applyMatrix4(matrix).project(camera);
		expect(torso.x).toBeCloseTo(0, 6);
		expect(torso.y).toBeCloseTo(0, 6);
	});

	it('平面の大きさが同じでも、高いモデルほど離れた視点を選ぶ', () => {
		const short = getModelFocusView(humanoid, style, viewport)!;
		const tall = getModelFocusView([-0.3, 0, -0.2, 0.3, 20, 0.2], style, viewport)!;
		expect(tall.position.distanceTo(tall.target)).toBeGreaterThan(
			short.position.distanceTo(short.target) * 5
		);
	});

	it('回転・単位倍率・高さ倍率・地形と高さオフセットを描画と揃える', () => {
		const transformed: ModelTransformStyle = {
			transform: {
				...style.transform,
				altitude: 50,
				heightOffset: 10,
				heightScale: 2,
				baseScale: 0.5,
				scaleUnit: 1,
				rotationX: 20,
				rotationY: 35,
				rotationZ: -10
			}
		};
		const view = getModelFocusView(humanoid, transformed, {
			...viewport,
			terrainEnabled: true,
			centerElevation: 50
		})!;
		const box = new Box3(new Vector3(-0.3, 0, -0.2), new Vector3(0.3, 2, 0.2))
			.applyMatrix4(buildMercatorModelMatrix(transformed.transform, true));
		const toCenter = box.getCenter(new Vector3()).sub(view.position).normalize();
		const toTarget = view.target.clone().sub(view.position).normalize();
		expect(toCenter.dot(toTarget)).toBeCloseTo(1, 8);
		expect(new MercatorCoordinate(view.target.x, view.target.y, view.target.z).toAltitude())
			.toBeCloseTo(50, 5);
	});

	it('地形OFFでは描画に使われないaltitudeをフォーカスにも加えない', () => {
		const elevated = { transform: { ...style.transform, altitude: 500 } };
		expect(getModelFocusView(humanoid, elevated, viewport))
			.toEqual(getModelFocusView(humanoid, style, viewport));
	});

	it('空・不正・点だけの範囲は従来処理へ戻す', () => {
		for (
			const bounds of [
				[0, 0, 0, 0, 0, 0],
				[2, 2, 2, 1, 1, 1],
				[NaN, 0, 0, 1, 1, 1]
			] as ModelLocalBounds[]
		) {
			expect(getModelFocusView(bounds, style, viewport)).toBeNull();
		}
	});
});
