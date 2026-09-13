import type { ModelLocalBounds, ModelTransformStyle } from '$routes/map/data/types/model';
import { type Map, MercatorCoordinate } from '$routes/map/utils/maplibre';
import { MathUtils, Matrix4, PerspectiveCamera, Vector4 } from 'three';
import { buildMercatorModelMatrix } from './mercator-model-matrix';
import { normalizeModelScale, normalizeModelTransformScale } from './model-scale';

export interface ModelPlacementViewport {
	width: number;
	height: number;
	worldToClip: Matrix4;
	terrainEnabled: boolean;
}

const VIEWPORT_FRACTION = 0.4;

/** 公開カメラ設定から、three.jsのMercator描画と同じ投影を保存する。地理的な2D boundsは使わない。 */
export const getInitialModelPlacementViewport = (map: Map): ModelPlacementViewport => {
	const { clientWidth: width, clientHeight: height } = map.getCanvas();
	const fov = map.getVerticalFieldOfView();
	const distance = height / (2 * Math.tan(MathUtils.degToRad(fov) / 2));
	const worldSize = 512 * 2 ** map.getZoom();
	const center = MercatorCoordinate.fromLngLat(map.getCenter(), map.getCameraTargetElevation());
	const padding = map.getPadding();
	const camera = new PerspectiveCamera(fov, width / height, height / 50, distance * 10000);
	const projection = camera.projectionMatrix;
	projection.elements[8] = -((padding.left ?? 0) - (padding.right ?? 0)) / width;
	projection.elements[9] = ((padding.top ?? 0) - (padding.bottom ?? 0)) / height;
	const worldToClip = projection
		.multiply(new Matrix4().makeScale(1, -1, 1))
		.multiply(new Matrix4().makeTranslation(0, 0, -distance))
		.multiply(new Matrix4().makeRotationZ(-MathUtils.degToRad(map.getRoll())))
		.multiply(new Matrix4().makeRotationX(MathUtils.degToRad(map.getPitch())))
		.multiply(new Matrix4().makeRotationZ(-MathUtils.degToRad(map.getBearing())))
		.multiply(
			new Matrix4().makeTranslation(
				-center.x * worldSize,
				-center.y * worldSize,
				-center.z * worldSize
			)
		)
		.multiply(new Matrix4().makeScale(worldSize, worldSize, worldSize));
	return { width, height, worldToClip, terrainEnabled: Boolean(map.getTerrain()) };
};

/** 回転・高さ・奥行き込みの8頂点を画面へ投影し、短辺の15％以内に収まる倍率を求める。 */
export const getInitialModelPlacementScale = (
	localBounds: ModelLocalBounds,
	viewport: ModelPlacementViewport,
	transform: ModelTransformStyle['transform']
) => {
	const fallback = normalizeModelTransformScale(transform);
	const { width, height, worldToClip, terrainEnabled } = viewport;
	if (
		!localBounds.every(Number.isFinite) ||
		!(width > 0 && height > 0) ||
		!worldToClip.elements.every(Number.isFinite)
	)
		return fallback;
	const spans = [0, 1, 2].map((axis) => localBounds[axis + 3] - localBounds[axis]);
	if (spans.some((span) => span < 0) || Math.max(...spans) <= 0 || transform.baseScale === 0) {
		return fallback;
	}

	const corners = [0, 3].flatMap((x) =>
		[1, 4].flatMap((y) =>
			[2, 5].map((z) => new Vector4(localBounds[x], localBounds[y], localBounds[z], 1))
		)
	);
	const fits = (scale: number) => {
		const matrix = worldToClip
			.clone()
			.multiply(buildMercatorModelMatrix({ ...transform, scale, scaleUnit: 0 }, terrainEnabled));
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;
		for (const corner of corners) {
			const point = corner.clone().applyMatrix4(matrix);
			// カメラの背後・手前のクリップ面をまたぐモデルは収まっていない。
			if (!point.toArray().every(Number.isFinite) || point.w <= 0 || point.z < -point.w) {
				return false;
			}
			const x = point.x / point.w;
			const y = point.y / point.w;
			if (Math.abs(x) > 1 || Math.abs(y) > 1) return false;
			minX = Math.min(minX, x);
			maxX = Math.max(maxX, x);
			minY = Math.min(minY, y);
			maxY = Math.max(maxY, y);
		}
		const targetPixels = Math.min(width, height) * VIEWPORT_FRACTION;
		return (
			((maxX - minX) * width) / 2 <= targetPixels && ((maxY - minY) * height) / 2 <= targetPixels
		);
	};
	if (!fits(0)) return fallback;
	let low = 0;
	let high = 1;
	while (fits(high) && high < 1e12) high *= 2;
	for (let iteration = 0; iteration < 64; iteration++) {
		const mid = (low + high) / 2;
		if (fits(mid)) low = mid;
		else high = mid;
	}
	return low > 0 ? normalizeModelScale(low) : fallback;
};
