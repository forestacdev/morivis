import { mapStore } from '$routes/stores/map';

interface SwingOptions {
	/** 回転角度（度） デフォルト: 8 */
	angle?: number;
	/** 揺れの回数 デフォルト: 3 */
	count?: number;
	/** 全体の時間(ms) デフォルト: 800 */
	duration?: number;
}

/** 回転揺れエフェクト。bearing を左右に揺らして元に戻す */
export const swing = (options?: SwingOptions): Promise<void> => {
	const angle = options?.angle ?? 8;
	const count = options?.count ?? 3;
	const duration = options?.duration ?? 800;
	const map = mapStore.getMap();
	if (!map) return Promise.resolve();

	return new Promise((resolve) => {
		const originalBearing = map.getBearing();
		const stepDuration = duration / (count * 2);

		let step = 0;
		const totalSteps = count * 2;

		const animate = () => {
			if (step >= totalSteps) {
				map.easeTo({
					bearing: originalBearing,
					duration: stepDuration,
					easing: (t) => t * t
				});
				setTimeout(() => resolve(), stepDuration);
				return;
			}

			const decay = 1 - step / totalSteps;
			const direction = step % 2 === 0 ? 1 : -1;
			const targetBearing = originalBearing + direction * angle * decay;

			map.easeTo({
				bearing: targetBearing,
				duration: stepDuration,
				easing: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)
			});

			step++;
			setTimeout(animate, stepDuration);
		};

		animate();
	});
};
