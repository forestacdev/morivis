import type { Map as MapLibreMap } from '$routes/map/utils/maplibre';

import type { GeoRefCorners } from './homography';
import { isInsideGeoRefImage, translateGeoRefCorners } from './translation';

/** Preview-only interaction. Changes corner state through the callback, never map layers. */
export const attachGeoRefImageDrag = (
	map: Pick<MapLibreMap, 'getCanvas' | 'project' | 'unproject' | 'dragPan' | 'stop'>,
	getCorners: () => GeoRefCorners,
	onTranslate: (corners: GeoRefCorners) => void
): () => void => {
	const canvas = map.getCanvas();
	const view = canvas.ownerDocument.defaultView;
	let active: {
		pointerId: number;
		corners: GeoRefCorners;
		start: [number, number];
		restorePan: boolean;
	} | null = null;
	let previousCursor: string | null = null;
	let hovering = false;
	let suppressClick = false;
	const cursor = (value: string | null) => {
		if (value !== null) {
			previousCursor ??= canvas.style.cursor;
			canvas.style.cursor = value;
		} else if (previousCursor !== null) {
			canvas.style.cursor = previousCursor;
			previousCursor = null;
		}
	};
	const screenPoint = (event: PointerEvent): [number, number] => {
		const rect = canvas.getBoundingClientRect();
		return [
			(event.clientX - rect.left) * canvas.clientWidth / rect.width,
			(event.clientY - rect.top) * canvas.clientHeight / rect.height
		];
	};
	const hit = (event: PointerEvent) =>
		isInsideGeoRefImage(
			screenPoint(event),
			getCorners().map((corner) => {
				const p = map.project(corner);
				return [p.x, p.y];
			}) as GeoRefCorners
		);
	const stop = (event: Event) => {
		event.preventDefault();
		event.stopImmediatePropagation();
	};
	const finish = () => {
		const previous = active;
		active = null;
		hovering = false;
		if (previous) {
			if (canvas.hasPointerCapture(previous.pointerId)) {
				canvas.releasePointerCapture(previous.pointerId);
			}
			if (previous.restorePan) map.dragPan.enable();
		}
		cursor(null);
	};
	const down = (event: PointerEvent) => {
		if (active) {
			stop(event);
			return;
		}
		suppressClick = false;
		if (
			event.button !== 0 || !event.isPrimary || event.shiftKey || event.ctrlKey
			|| event.metaKey || !hit(event)
		) return;
		map.stop();
		const position = map.unproject(screenPoint(event));
		active = {
			pointerId: event.pointerId,
			corners: getCorners().map((corner) => [...corner]) as GeoRefCorners,
			start: [position.lng, position.lat],
			restorePan: map.dragPan.isEnabled()
		};
		stop(event);
		map.dragPan.disable();
		canvas.setPointerCapture(event.pointerId);
		suppressClick = true;
		cursor('grabbing');
	};
	const move = (event: PointerEvent) => {
		if (!active) {
			hovering = event.buttons === 0 && hit(event);
			cursor(hovering ? 'grab' : null);
			return;
		}
		stop(event);
		if (event.pointerId !== active.pointerId) return;
		const position = map.unproject(screenPoint(event));
		onTranslate(
			translateGeoRefCorners(active.corners, active.start, [position.lng, position.lat])
		);
	};
	const up = (event: PointerEvent) => {
		if (!active || event.pointerId !== active.pointerId) return;
		stop(event);
		finish();
	};
	const leave = () => {
		if (!active) {
			hovering = false;
			cursor(null);
		}
	};
	const blockCompatibilityEvent = (event: Event) => {
		// MapLibre handles mouse/touch events in addition to pointer events.
		if (active || (event.type === 'mousemove' && hovering)) stop(event);
	};
	const click = (event: Event) => {
		if (suppressClick) {
			stop(event);
			suppressClick = false;
		}
	};
	const listeners: [string, EventListener][] = [
		['pointerdown', down as EventListener],
		['pointermove', move as EventListener],
		['pointerup', up as EventListener],
		['pointercancel', up as EventListener],
		['lostpointercapture', up as EventListener],
		['pointerleave', leave],
		['click', click],
		...['mousedown', 'mousemove', 'touchstart', 'touchmove', 'wheel'].map((
			name
		): [string, EventListener] => [name, blockCompatibilityEvent])
	];
	for (const [name, handler] of listeners) {
		canvas.addEventListener(name, handler, { capture: true, passive: false });
	}
	view?.addEventListener('blur', finish);
	return () => {
		for (const [name, handler] of listeners) {
			canvas.removeEventListener(name, handler, { capture: true });
		}
		view?.removeEventListener('blur', finish);
		finish();
	};
};
