import type { Map as MapLibreMap, MapWheelEvent } from '$routes/map/utils/maplibre';

export const SCROLL_ZOOM_CONFIG = {
	// モデルビューのTrackballControlsと同じ、60fps換算で1フレームに減衰する割合。
	damping: 0.2,
	duration: 500,
	trackpadDuration: 80,
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
// MapLibre の標準ハンドラーと同じ、ブラウザーがホイールに使う刻み幅。
const WHEEL_DELTA = 4.000244140625;
type ScrollInput = 'wheel' | 'trackpad';
type ScrollEvent = Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'shiftKey' | 'ctrlKey'>;

/** 小さい入力で判別したトラックパッドは、加速しても同じ操作中は維持する。 */
export const createScrollInputClassifier = () => {
	let input: ScrollInput = 'wheel';
	let lastTime: number | null = null;
	return (event: ScrollEvent, time: number): ScrollInput => {
		const interval = lastTime === null ? Infinity : time - lastTime;
		if (interval > 400) input = 'wheel';
		lastTime = time;
		const amount = Math.abs(event.deltaY);
		if (event.ctrlKey) {
			input = 'trackpad';
		} else if (event.deltaMode !== 0 || (amount > 0 && amount % WHEEL_DELTA === 0)) {
			input = 'wheel';
		} else if (amount > 0 && amount < 4) {
			input = 'trackpad';
		} else if (input !== 'trackpad' && amount < 40 && interval * amount < 200) {
			input = 'trackpad';
		}
		return input;
	};
};

export const scrollZoomEasing = (progress: number): number => {
	const { damping, duration } = SCROLL_ZOOM_CONFIG;
	const remaining = (1 - damping) ** (duration / FRAME_MS);
	return (1 - remaining ** progress) / (1 - remaining);
};

export const getScrollZoomDelta = (
	event: ScrollEvent,
	zoom: number,
	viewportHeight: number,
	input?: ScrollInput
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
	const isTrackpad = input ? input === 'trackpad' : event.ctrlKey || Math.abs(pixels) < 4;
	const rate = isTrackpad ? config.trackpadRate : config.wheelRate;
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
	let frame: number | null = null;
	let pending: { original: WheelEvent; input: ScrollInput; } | null = null;
	const classifyInput = createScrollInputClassifier();
	const cancelFrame = () => {
		if (frame !== null) cancelAnimationFrame(frame);
		frame = null;
		pending = null;
	};
	const resetTarget = () => {
		if (frame === null) targetZoom = null;
	};
	const stop = () => {
		cancelFrame();
		if (targetZoom !== null) map.stop();
		resetTarget();
	};
	const flush = () => {
		frame = null;
		if (disposed || !pending || targetZoom === null) return;
		const { original, input } = pending;
		const next = targetZoom;
		pending = null;
		const canvas = map.getCanvas();
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
			duration: input === 'trackpad'
				? SCROLL_ZOOM_CONFIG.trackpadDuration
				: SCROLL_ZOOM_CONFIG.duration,
			easing: input === 'trackpad' ? (progress) => 1 - (1 - progress) ** 2 : scrollZoomEasing,
			easeId: EASE_ID
		}, { originalEvent: original });
		// reduced-motion時はeaseToが即座に完了するので、残りの勢いを保持しない。
		targetZoom = map.isZooming() ? next : null;
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
		if (!Number.isFinite(original.deltaY) || original.deltaY === 0) return;
		const input = classifyInput(original, performance.now());
		const delta = getScrollZoomDelta(original, current, canvas.clientHeight, input);
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
		targetZoom = next;
		pending = { original, input };
		if (frame === null) frame = requestAnimationFrame(flush);
	};
	const dispose = (restore = true) => {
		if (disposed) return;
		disposed = true;
		cancelFrame();
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
