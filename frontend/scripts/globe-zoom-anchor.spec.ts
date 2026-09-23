import { afterEach, describe, expect, it, vi } from 'vitest';
import { LngLat } from '../node_modules/maplibre-gl/src/geo/lng_lat';
import { GlobeTransform } from '../node_modules/maplibre-gl/src/geo/projection/globe_transform';
import { VerticalPerspectiveCameraHelper } from '../node_modules/maplibre-gl/src/geo/projection/vertical_perspective_camera_helper';
import { Camera, type CameraInitOptions } from '../node_modules/maplibre-gl/src/ui/camera';
import { correctGlobeZoomAnchor } from '../src/routes/map/utils/platform/globe-zoom-anchor';

afterEach(() => vi.unstubAllGlobals());

// 非公開の投影メソッドへの依存を、インストール済み MapLibre の実装で検証する。
const createTransform = (zoom = 3, latitude = 0, bearing = 0, pitch = 0) => {
	const transform = new GlobeTransform();
	transform.resize(800, 600);
	transform.setCenter(new LngLat(0, latitude));
	transform.setZoom(zoom);
	transform.setBearing(bearing);
	transform.setPitch(pitch);
	return transform;
};

describe('グローブのズーム位置補正（MapLibre 実投影）', () => {
	it.each([
		[2, 0, 0, 0],
		[4, 45, 30, 0],
		[6, -45, -30, 30],
		[10, 70, 45, 45]
	])(
		'ズーム %s・緯度 %s・方位 %s・傾斜 %s でカーソル下の地点を維持する',
		(zoom, lat, bearing, pitch) => {
			const transform = createTransform(zoom, lat, bearing, pitch);
			const point = transform.centerPoint.add({ x: 40, y: -30 });
			const location = transform.screenPointToLocation(point);
			for (const delta of [0.05, 0.1, 0.25, -0.1, -0.25]) {
				const next = transform.clone();
				next.setZoom(zoom + delta);
				const corrected = correctGlobeZoomAnchor(next, { location, point });
				expect(corrected.center).toBeDefined();
				const actual = next.locationToScreenPoint(location);
				expect(Math.hypot(actual.x - point.x, actual.y - point.y)).toBeLessThan(0.01);
			}
		}
	);

	it('地球の外側は中心を動かさない', () => {
		const transform = createTransform(0);
		const point = transform.centerPoint.add({ x: 390, y: 290 });
		expect(transform.isPointOnMapSurface(point)).toBe(false);
		expect(correctGlobeZoomAnchor(transform, {
			location: new LngLat(0, 0),
			point
		})).toEqual({ center: transform.center, zoom: transform.zoom });
	});

	it('日付変更線をまたぐ地点も固定する', () => {
		const transform = createTransform(3);
		transform.setCenter(new LngLat(179, 0));
		const point = transform.centerPoint.add({ x: 40, y: 0 });
		const location = transform.screenPointToLocation(point);
		transform.setZoom(3.5);
		correctGlobeZoomAnchor(transform, { location, point });
		const actual = transform.locationToScreenPoint(location);
		expect(Math.hypot(actual.x - point.x, actual.y - point.y)).toBeLessThan(0.01);
	});
	it.each([0, 0.5, 1])('投影の遷移率 %s でも地点を固定する', (transition) => {
		const transform = createTransform(12, 45);
		transform.setTransitionState(transition);
		const point = transform.centerPoint.add({ x: 40, y: -30 });
		const location = transform.screenPointToLocation(point);
		transform.setZoom(12.25);
		correctGlobeZoomAnchor(transform, { location, point });
		const actual = transform.locationToScreenPoint(location);
		expect(Math.hypot(actual.x - point.x, actual.y - point.y)).toBeLessThan(0.01);
	});

	it('縮小で固定できなくなっても中心を開始位置に戻さない', () => {
		const transform = createTransform(0);
		const point = transform.centerPoint.add({ x: 390, y: 290 });
		const previousCenter = new LngLat(10, 10);
		const corrected = correctGlobeZoomAnchor(transform, {
			location: new LngLat(0, 0),
			point
		}, previousCenter);
		expect(corrected.center).toEqual(previousCenter);
		expect(corrected.zoom).toBeCloseTo(Math.log2(Math.cos(10 * Math.PI / 180)));
	});

	it('実カメラのアニメーション各フレームと再入力でも地点を固定する', () => {
		vi.stubGlobal('matchMedia', () => ({ matches: false }));
		const camera = new Camera({
			transformConstrain: null,
			requestRenderFrame: () => 1,
			cancelRenderFrame: () => {}
		} as unknown as CameraInitOptions);
		camera.transform = createTransform(3, 45, 30, 20);
		camera.cameraHelper = new VerticalPerspectiveCameraHelper();
		const point = camera.transform.centerPoint.add({ x: 70, y: -50 });
		const location = camera.transform.screenPointToLocation(point);
		camera.transformCameraUpdate = (next) =>
			correctGlobeZoomAnchor(
				next,
				{ location, point },
				camera.transform.center
			);
		for (const delta of [0.2, 0.3, -0.2, -0.3]) {
			camera.stop();
			camera.easeTo({ zoom: camera.transform.zoom + delta, duration: 500 });
			for (const progress of [0, 0.1, 0.3, 0.7, 1]) {
				camera._onEaseFrame(progress);
				const actual = camera.transform.locationToScreenPoint(location);
				expect(Math.hypot(actual.x - point.x, actual.y - point.y)).toBeLessThan(0.01);
			}
		}
		camera.stop();
	});
});
