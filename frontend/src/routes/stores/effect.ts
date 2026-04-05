import { writable } from 'svelte/store';

export const showLockOnScreen = writable<boolean>(false);

export const transitionPageScreen = writable<1 | 0 | -1>(-1);

export const mapPaneScale = writable<number>(1);

let mapPaneScaleAnimationFrame: number | null = null;

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export const triggerMapPaneScale = (targetScale = 0.98, shrinkDuration = 90, expandDuration = 220) => {
	if (mapPaneScaleAnimationFrame !== null) {
		cancelAnimationFrame(mapPaneScaleAnimationFrame);
		mapPaneScaleAnimationFrame = null;
	}

	const startTime = performance.now();
	const totalDuration = shrinkDuration + expandDuration;

	const animate = (now: number) => {
		const elapsed = now - startTime;

		if (elapsed <= shrinkDuration) {
			const progress = elapsed / shrinkDuration;
			const eased = easeOutExpo(progress);
			mapPaneScale.set(1 - (1 - targetScale) * eased);
		} else if (elapsed <= totalDuration) {
			const progress = (elapsed - shrinkDuration) / expandDuration;
			const eased = easeOutCubic(progress);
			mapPaneScale.set(targetScale + (1 - targetScale) * eased);
		} else {
			mapPaneScale.set(1);
			mapPaneScaleAnimationFrame = null;
			return;
		}

		mapPaneScaleAnimationFrame = requestAnimationFrame(animate);
	};

	mapPaneScaleAnimationFrame = requestAnimationFrame(animate);
};
