import type { CameraUpdateTransformFunction, LngLat, Point } from '$routes/map/utils/maplibre';

type CameraState = Parameters<CameraUpdateTransformFunction>[0];
type AnchorTransform = CameraState & {
	isGlobeRendering: boolean;
	isPointOnMapSurface: (point: Point) => boolean;
	setLocationAtPoint: (location: LngLat, point: Point) => void;
	locationToScreenPoint: (location: LngLat) => Point;
};

/**
 * MapLibre 6.4 の transformCameraUpdate には、更新後の ITransform のコピーが渡る。
 * 公開型に含まれない投影メソッドへの依存をここに限定する。
 * 地形・投影の内部状態はコピーのまま使い、実際の地図には center/zoom だけを返す。
 */
export const correctGlobeZoomAnchor = (
	next: CameraState,
	anchor: { location: LngLat; point: Point; },
	previousCenter: LngLat = next.center
): ReturnType<CameraUpdateTransformFunction> => {
	const transform = next as Partial<AnchorTransform>;
	if (
		typeof transform.isPointOnMapSurface !== 'function'
		|| typeof transform.setLocationAtPoint !== 'function'
		|| typeof transform.locationToScreenPoint !== 'function'
	) return {};
	const latitudeScale = (latitude: number) => Math.max(1e-6, Math.cos(latitude * Math.PI / 180));
	const fallback = {
		center: previousCenter,
		zoom: next.zoom + (transform.isGlobeRendering
			? Math.log2(latitudeScale(previousCenter.lat) / latitudeScale(next.center.lat))
			: 0)
	};
	if (!transform.isPointOnMapSurface(anchor.point)) return fallback;
	transform.setLocationAtPoint(anchor.location, anchor.point);
	const projected = transform.locationToScreenPoint(anchor.location);
	// 地平線の外や極付近では解がないことがある。遠い解へカメラを飛ばさない。
	if (
		!Number.isFinite(next.zoom) || !Number.isFinite(next.center.lng)
		|| !Number.isFinite(next.center.lat)
		|| !Number.isFinite(projected.x) || !Number.isFinite(projected.y)
		|| Math.hypot(projected.x - anchor.point.x, projected.y - anchor.point.y) > 1
	) return fallback;
	// setLocationAtPoint が行う緯度によるズーム補正も一緒に反映する。
	return { center: next.center, zoom: next.zoom };
};
