import type { ModelLocalBounds } from '$routes/map/data/types/model';
import type { Map } from '$routes/map/utils/maplibre';
import { Vector4 } from 'three';
import { describe, expect, it } from 'vitest';
import { buildMercatorModelMatrix } from './mercator-model-matrix';
import {
	getInitialModelPlacementScale,
	getInitialModelPlacementViewport
} from './model-initial-scale';
import { getEffectiveModelScale } from './model-scale';

const transform = {
	lng: 0,
	lat: 0,
	altitude: 0,
	scale: 1,
	baseScale: 1,
	rotationX: 0,
	rotationY: 0,
	rotationZ: 0
};
const createMap = (pitch = 0, zoom = 16, width = 800, height = 600) =>
	({
		getCanvas: () => ({ clientWidth: width, clientHeight: height }),
		getCenter: () => ({ lng: 0, lat: 0 }),
		getCameraTargetElevation: () => 0,
		getVerticalFieldOfView: () => 45,
		getZoom: () => zoom,
		getBearing: () => 30,
		getPitch: () => pitch,
		getRoll: () => 0,
		getPadding: () => ({ left: 0, right: 0, top: 0, bottom: 0 }),
		getTerrain: () => null
	}) as unknown as Map;
const bounds: ModelLocalBounds = [-1, 0, -1, 1, 10, 1];

const getScreenSize = (map: Map, localBounds = bounds, initialTransform = transform) => {
	const viewport = getInitialModelPlacementViewport(map);
	const scale = getInitialModelPlacementScale(localBounds, viewport, initialTransform);
	const matrix = viewport.worldToClip.clone().multiply(
		buildMercatorModelMatrix({ ...initialTransform, ...scale }, false)
	);
	const corners = [0, 3].flatMap(x =>
		[1, 4].flatMap(y =>
			[2, 5].map(z => {
				const point = new Vector4(localBounds[x], localBounds[y], localBounds[z], 1)
					.applyMatrix4(matrix);
				return [
					point.x / point.w * viewport.width / 2,
					point.y / point.w * viewport.height / 2
				];
			})
		)
	);
	const dimensions = [0, 1].map(axis =>
		Math.max(...corners.map(p => p[axis])) - Math.min(...corners.map(p => p[axis]))
	);
	return { size: Math.max(...dimensions), scale: getEffectiveModelScale(scale) };
};

describe('3D boundsから決めるモデルの初期スケール', () => {
	it.each([0, 45, 70, 85])('ピッチ %s 度でも画面短辺の15％に収まる', pitch => {
		expect(getScreenSize(createMap(pitch)).size).toBeCloseTo(90, 3);
	});
	it('ズームを1段拡大すると初期倍率が半分になり、画面上の大きさは変わらない', () => {
		const initial = getScreenSize(createMap(60, 16));
		const zoomed = getScreenSize(createMap(60, 17));
		expect(zoomed.scale).toBeCloseTo(initial.scale / 2, 4);
		expect(zoomed.size).toBeCloseTo(initial.size, 3);
	});
	it('縦長のビューポートでは横幅に合わせる', () => {
		expect(getScreenSize(createMap(60, 16, 400, 800)).size).toBeCloseTo(60, 3);
	});
	it('同じ底面でも高さのあるモデルは小さい倍率にする', () => {
		const map = createMap(70);
		expect(getScreenSize(map).scale).toBeLessThan(
			getScreenSize(map, [-1, 0, -1, 1, 2, 1]).scale
		);
	});
	it('単位倍率やモデルの回転も反映する', () => {
		const map = createMap(50);
		const base = getScreenSize(map);
		const converted = getScreenSize(map, bounds, { ...transform, baseScale: 0.001 });
		expect(converted.scale * 0.001).toBeCloseTo(base.scale, 4);
		expect(getScreenSize(map, bounds, { ...transform, rotationZ: 45 }).size).toBeCloseTo(90, 3);
	});
	it('空の3D範囲やサイズ0のビューポートでは元の倍率を維持する', () => {
		const original = { ...transform, scale: 2, scaleUnit: -3 };
		expect(
			getInitialModelPlacementScale(
				[0, 0, 0, 0, 0, 0],
				getInitialModelPlacementViewport(createMap()),
				original
			)
		)
			.toEqual({ scale: 2, scaleUnit: -3 });
		expect(
			getInitialModelPlacementScale(
				bounds,
				getInitialModelPlacementViewport(createMap(0, 16, 0, 0)),
				original
			)
		)
			.toEqual({ scale: 2, scaleUnit: -3 });
	});
});
