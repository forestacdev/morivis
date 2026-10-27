/** 地図の通常タップ・パン・ピンチを維持しながら長押しを検出する。 */
export const attachLongPress = (
	element: HTMLElement,
	onLongPress: (point: { clientX: number; clientY: number; }) => void
) => {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let start: { clientX: number; clientY: number; identifier: number; } | null = null;
	let fired = false;
	let suppressUntil = 0;
	const cancelTimer = () => {
		clearTimeout(timer);
		timer = undefined;
	};
	const shouldSuppressClick = () => fired || Date.now() < suppressUntil;
	const handleStart = (event: TouchEvent) => {
		cancelTimer();
		start = null;
		if (event.touches.length !== 1) return;
		fired = false;
		suppressUntil = 0;
		const touch = event.touches[0];
		start = { clientX: touch.clientX, clientY: touch.clientY, identifier: touch.identifier };
		const point = start;
		timer = setTimeout(() => {
			fired = true;
			onLongPress(point);
		}, 500);
	};
	const handleMove = (event: TouchEvent) => {
		const touch = Array.from(event.touches).find((item) =>
			item.identifier === start?.identifier
		);
		if (
			!start || !touch || event.touches.length !== 1
			|| Math.hypot(touch.clientX - start.clientX, touch.clientY - start.clientY) > 10
		) {
			cancelTimer();
		}
	};
	const handleEnd = (event: TouchEvent) => {
		cancelTimer();
		start = null;
		if (fired) {
			if (event.cancelable) event.preventDefault();
			suppressUntil = Date.now() + 800;
		}
		fired = false;
	};
	const suppressClick = (event: MouseEvent) => {
		if (!shouldSuppressClick()) return;
		event.preventDefault();
		event.stopImmediatePropagation();
	};
	const suppressContextMenu = (event: MouseEvent) => {
		// OSの長押しメニューとアプリの長押し処理が二重に発火するのを防ぐ。
		if (!start && !shouldSuppressClick()) return;
		event.preventDefault();
		event.stopImmediatePropagation();
	};
	element.addEventListener('touchstart', handleStart, { passive: true });
	element.addEventListener('touchmove', handleMove, { passive: true });
	element.addEventListener('touchend', handleEnd, { passive: false });
	element.addEventListener('touchcancel', handleEnd, { passive: false });
	element.addEventListener('click', suppressClick, true);
	element.addEventListener('contextmenu', suppressContextMenu, true);
	return {
		shouldSuppressClick,
		destroy: () => {
			cancelTimer();
			element.removeEventListener('touchstart', handleStart);
			element.removeEventListener('touchmove', handleMove);
			element.removeEventListener('touchend', handleEnd);
			element.removeEventListener('touchcancel', handleEnd);
			element.removeEventListener('click', suppressClick, true);
			element.removeEventListener('contextmenu', suppressContextMenu, true);
		}
	};
};
