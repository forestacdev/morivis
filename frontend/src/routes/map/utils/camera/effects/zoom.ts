import { mapStore } from '$routes/stores/map';

interface PulseZoomOptions {
	/** ズームイン量 デフォルト: 0.5 */
	zoomDelta?: number;
	/** 全体の時間(ms) デフォルト: 600 */
	duration?: number;
}

interface BreathOptions {
	/** ズーム変化量 デフォルト: 0.3 */
	zoomDelta?: number;
	/** 1サイクルの時間(ms) デフォルト: 2000 */
	cycleDuration?: number;
	/** 繰り返し回数 デフォルト: Infinity */
	count?: number;
}

/** 一瞬ズームインしてから元に戻るフォーカス演出 */
export const pulseZoom = (options?: PulseZoomOptions): Promise<void> => {
	const zoomDelta = options?.zoomDelta ?? 0.5;
	const duration = options?.duration ?? 600;
	const map = mapStore.getMap();
	if (!map) return Promise.resolve();

	return new Promise((resolve) => {
		const originalZoom = map.getZoom();
		const half = duration / 2;

		map.easeTo({
			zoom: originalZoom + zoomDelta,
			duration: half,
			easing: (t) => t * (2 - t)
		});

		setTimeout(() => {
			map.easeTo({
				zoom: originalZoom,
				duration: half,
				easing: (t) => t * t
			});
			setTimeout(() => resolve(), half);
		}, half);
	});
};

/** 呼吸するようなズーム。返り値の関数を呼ぶと停止する */
export const breathe = (options?: BreathOptions): (() => void) => {
	const zoomDelta = options?.zoomDelta ?? 0.3;
	const cycleDuration = options?.cycleDuration ?? 2000;
	const maxCount = options?.count ?? Infinity;

	const map = mapStore.getMap();
	if (!map) return () => {};

	const originalZoom = map.getZoom();
	let stopped = false;
	let cycle = 0;
	const half = cycleDuration / 2;

	const animate = () => {
		if (stopped || cycle >= maxCount) {
			map.easeTo({ zoom: originalZoom, duration: half });
			return;
		}

		map.easeTo({
			zoom: originalZoom + zoomDelta,
			duration: half,
			easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
		});

		setTimeout(() => {
			if (stopped) {
				map.easeTo({ zoom: originalZoom, duration: half });
				return;
			}

			map.easeTo({
				zoom: originalZoom,
				duration: half,
				easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
			});

			cycle++;
			setTimeout(animate, half);
		}, half);
	};

	animate();

	return () => {
		stopped = true;
	};
};
