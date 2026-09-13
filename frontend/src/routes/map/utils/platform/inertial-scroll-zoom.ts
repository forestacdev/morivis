import type { Map as MapLibreMap, MapWheelEvent } from '$routes/map/utils/maplibre';

export const SCROLL_ZOOM_CONFIG = {
	// モデルビューのTrackballControlsと同じ、60fps換算で1フレームに減衰する割合。
	damping: 0.2,
	duration: 500,
	wheelRate: 1 / 450,
	trackpadRate: 1 / 100,
	highZoomStart: 21,
	highZoomEnd: 25,
	minRateScale: 0.25,
	// 入力をためすぎて、手を止めたあとに大きくズームし続けるのを防ぐ。
	maxPendingZoom: 1.5
};

const EASE_ID = 'morivis-inertial-scroll-zoom';
const FRAME_MS = 1000 / 60;

export const scrollZoomEasing = (progress: number): number => {
	const { damping, duration } = SCROLL_ZOOM_CONFIG;
	const remaining = (1 - damping) ** (duration / FRAME_MS);
	return (1 - remaining ** progress) / (1 - remaining);
};

export const getScrollZoomDelta = (
	event: Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'shiftKey' | 'ctrlKey'>,
	zoom: number,
	viewportHeight: number
): number => {
	const config = SCROLL_ZOOM_CONFIG;
	const pixels = event.deltaY
		* (event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? viewportHeight : 1);
	if (!Number.isFinite(pixels) || pixels === 0) return 0;
	const progress = Math.max(
		0,
		Math.min(1, (zoom - config.highZoomStart) / (config.highZoomEnd - config.highZoomStart))
	);
	const rateScale = 1 - progress * (1 - config.minRateScale);
	const rate = event.ctrlKey || Math.abs(pixels) < 4 ? config.trackpadRate : config.wheelRate;
	const amount = Math.abs(pixels) * rate * rateScale * (event.shiftKey ? 0.25 : 1);
	return -Math.sign(pixels) * Math.log2(2 / (1 + Math.exp(-amount)));
};

export const getScrollZoomTarget = (
	current: number,
	previousTarget: number | null,
	delta: number,
	min: number,
	max: number
) => {
	const remaining = previousTarget === null ? 0 : previousTarget - current;
	// 逆方向の入力では古い勢いを捨て、その場から反転する。
	const base = remaining * delta > 0 ? previousTarget! : current;
	const limit = SCROLL_ZOOM_CONFIG.maxPendingZoom;
	return Math.max(
		min,
		Math.min(max, Math.max(current - limit, Math.min(current + limit, base + delta)))
	);
};

/** 標準ホイール処理を置き換え、公開カメラAPIで減衰付きズームを行う。 */
export const configureInertialScrollZoom = (map: MapLibreMap) => {
	if (!map.scrollZoom.isEnabled()) return () => {};
	map.scrollZoom.disable();
	let targetZoom: number | null = null;
	let disposed = false;
	const resetTarget = () => {
		targetZoom = null;
	};
	const stop = () => {
		if (targetZoom !== null) map.stop();
		resetTarget();
	};
	const onWheel = (event: MapWheelEvent) => {
		if (event.defaultPrevented || map.dragPan.isActive() || map.touchZoomRotate.isActive()) {
			return;
		}
		const original = event.originalEvent;
		if (
			map.cooperativeGestures.isEnabled() && !original.ctrlKey
			&& !map.cooperativeGestures.isBypassed(original)
		) {
			map.cooperativeGestures.notifyGestureBlocked('wheel_zoom', original);
			return;
		}
		const canvas = map.getCanvas();
		const current = map.getZoom();
		const delta = getScrollZoomDelta(original, current, canvas.clientHeight);
		if (!delta) return;
		original.preventDefault();
		const next = getScrollZoomTarget(
			current,
			targetZoom,
			delta,
			map.getMinZoom(),
			map.getMaxZoom()
		);
		if (next === current) {
			stop();
			return;
		}
		const rect = canvas.getBoundingClientRect();
		const point: [number, number] = [
			(original.clientX - rect.left) * canvas.clientWidth / rect.width,
			(original.clientY - rect.top) * canvas.clientHeight / rect.height
		];
		const anchor = map.unproject(point);
		map.easeTo({
			zoom: next,
			around: Number.isFinite(anchor.lng) && Number.isFinite(anchor.lat)
				? anchor
				: map.getCenter(),
			duration: SCROLL_ZOOM_CONFIG.duration,
			easing: scrollZoomEasing,
			easeId: EASE_ID
		}, { originalEvent: original });
		// reduced-motion時はeaseToが即座に完了するので、残りの勢いを保持しない。
		targetZoom = map.isZooming() ? next : null;
	};
	const dispose = (restore = true) => {
		if (disposed) return;
		disposed = true;
		map.off('wheel', onWheel);
		map.off('moveend', resetTarget);
		map.off('mousedown', stop);
		map.off('touchstart', stop);
		map.off('remove', onRemove);
		if (restore) {
			stop();
			map.scrollZoom.enable();
		}
	};
	const onRemove = () => dispose(false);
	map.on('wheel', onWheel);
	map.on('moveend', resetTarget);
	map.on('mousedown', stop);
	map.on('touchstart', stop);
	map.on('remove', onRemove);
	return dispose;
};
