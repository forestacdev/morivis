import { mapStore } from '$routes/stores/map';

interface ShakeOptions {
	/** 揺れの強さ（ピクセル） デフォルト: 7 */
	intensity?: number;
	/** 揺れの回数 デフォルト: 6 */
	count?: number;
	/** 全体の時間(ms) デフォルト: 400 */
	duration?: number;
}

interface ImpactOptions {
	/** 打撃の強さ（ピクセル） デフォルト: 20 */
	intensity?: number;
	/** 打撃の方向（度、0=右、90=下） デフォルト: 90（下） */
	angle?: number;
	/** 全体の時間(ms) デフォルト: 300 */
	duration?: number;
}

interface WhirlOptions {
	/** 円運動の半径（ピクセル） デフォルト: 15 */
	radius?: number;
	/** 全体の時間(ms) デフォルト: 400 */
	duration?: number;
}

interface RotationalVibrationOptions {
	/** 振動の半径（ピクセル） デフォルト: 8 */
	radius?: number;
	/** 1秒あたりの回転数 デフォルト: 20 */
	frequency?: number;
	/** 全体の時間(ms) デフォルト: 500 */
	duration?: number;
}

/** 横揺れエフェクト（衝撃・通知演出） */
export const shake = (options?: ShakeOptions): Promise<void> => {
	const pixelIntensity = options?.intensity ?? 7;
	const count = options?.count ?? 6;
	const duration = options?.duration ?? 400;
	const map = mapStore.getMap();
	if (!map) return Promise.resolve();

	return new Promise((resolve) => {
		const center = map.getCenter();
		const offsetPoint = map.unproject([
			map.getCanvas().clientWidth / 2 + pixelIntensity,
			map.getCanvas().clientHeight / 2
		]);
		const lngPerPixel = Math.abs(offsetPoint.lng - center.lng);
		const stepDuration = duration / count;

		let step = 0;
		const animate = () => {
			if (step >= count) {
				map.setCenter(center);
				resolve();
				return;
			}

			const decay = 1 - step / count;
			const offsetLng = (step % 2 === 0 ? 1 : -1) * lngPerPixel * decay;

			map.easeTo({
				center: [center.lng + offsetLng, center.lat],
				duration: stepDuration,
				easing: (t) => t
			});

			step++;
			setTimeout(animate, stepDuration);
		};

		animate();
	});
};

/** 縦揺れエフェクト */
export const verticalShake = (options?: ShakeOptions): Promise<void> => {
	const pixelIntensity = options?.intensity ?? 7;
	const count = options?.count ?? 6;
	const duration = options?.duration ?? 400;
	const map = mapStore.getMap();
	if (!map) return Promise.resolve();

	return new Promise((resolve) => {
		const center = map.getCenter();
		const offsetPoint = map.unproject([
			map.getCanvas().clientWidth / 2,
			map.getCanvas().clientHeight / 2 + pixelIntensity
		]);
		const latPerPixel = Math.abs(offsetPoint.lat - center.lat);
		const stepDuration = duration / count;

		let step = 0;
		const animate = () => {
			if (step >= count) {
				map.setCenter(center);
				resolve();
				return;
			}

			const decay = 1 - step / count;
			const offsetLat = (step % 2 === 0 ? 1 : -1) * latPerPixel * decay;

			map.easeTo({
				center: [center.lng, center.lat + offsetLat],
				duration: stepDuration,
				easing: (t) => t
			});

			step++;
			setTimeout(animate, stepDuration);
		};

		animate();
	});
};

/** 打撃エフェクト（一瞬ガクッと動いて戻る） */
export const impact = (options?: ImpactOptions): Promise<void> => {
	const pixelIntensity = options?.intensity ?? 20;
	const angle = options?.angle ?? 90;
	const duration = options?.duration ?? 300;
	const map = mapStore.getMap();
	if (!map) return Promise.resolve();

	return new Promise((resolve) => {
		const center = map.getCenter();
		const rad = (angle * Math.PI) / 180;
		const cx = map.getCanvas().clientWidth / 2;
		const cy = map.getCanvas().clientHeight / 2;

		const offsetPoint = map.unproject([
			cx + Math.cos(rad) * pixelIntensity,
			cy + Math.sin(rad) * pixelIntensity
		]);
		const dLng = offsetPoint.lng - center.lng;
		const dLat = offsetPoint.lat - center.lat;

		map.easeTo({
			center: [center.lng + dLng, center.lat + dLat],
			duration: duration * 0.2,
			easing: (t) => t
		});

		setTimeout(() => {
			map.easeTo({
				center: [center.lng, center.lat],
				duration: duration * 0.8,
				easing: (t) => {
					const c4 = (2 * Math.PI) / 3;
					return t === 0
						? 0
						: t === 1
							? 1
							: Math.pow(2, -8 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
				}
			});
			setTimeout(() => resolve(), duration * 0.8);
		}, duration * 0.2);
	});
};

/** ぐるんエフェクト（中心点が円を描いて戻る） */
export const whirl = (options?: WhirlOptions): Promise<void> => {
	const radius = options?.radius ?? 15;
	const duration = options?.duration ?? 400;
	const map = mapStore.getMap();
	if (!map) return Promise.resolve();

	return new Promise((resolve) => {
		const center = map.getCenter();
		const cx = map.getCanvas().clientWidth / 2;
		const cy = map.getCanvas().clientHeight / 2;

		const p0 = map.unproject([cx, cy]);
		const p1 = map.unproject([cx + 1, cy + 1]);
		const lngPerPx = Math.abs(p1.lng - p0.lng);
		const latPerPx = Math.abs(p1.lat - p0.lat);

		const startTime = performance.now();

		const animate = (now: number) => {
			const elapsed = now - startTime;
			const t = Math.min(elapsed / duration, 1);
			const decay = 1 - t;
			const angle = t * Math.PI * 2;
			const offsetLng = Math.cos(angle) * radius * lngPerPx * decay;
			const offsetLat = Math.sin(angle) * radius * latPerPx * decay;

			map.setCenter([center.lng + offsetLng, center.lat + offsetLat]);

			if (t < 1) {
				requestAnimationFrame(animate);
			} else {
				map.setCenter(center);
				resolve();
			}
		};

		requestAnimationFrame(animate);
	});
};

/** ロータリーバイブレーション（高速円運動による振動感） */
export const rotationalVibration = (options?: RotationalVibrationOptions): Promise<void> => {
	const radius = options?.radius ?? 8;
	const frequency = options?.frequency ?? 20;
	const duration = options?.duration ?? 500;
	const map = mapStore.getMap();
	if (!map) return Promise.resolve();

	return new Promise((resolve) => {
		const center = map.getCenter();
		const cx = map.getCanvas().clientWidth / 2;
		const cy = map.getCanvas().clientHeight / 2;

		const p0 = map.unproject([cx, cy]);
		const p1 = map.unproject([cx + 1, cy + 1]);
		const lngPerPx = Math.abs(p1.lng - p0.lng);
		const latPerPx = Math.abs(p1.lat - p0.lat);

		const startTime = performance.now();

		const animate = (now: number) => {
			const elapsed = now - startTime;
			const t = Math.min(elapsed / duration, 1);
			const decay = 1 - t;
			const angle = (elapsed / 1000) * frequency * Math.PI * 2;
			const r = radius * decay;

			map.setCenter([
				center.lng + Math.cos(angle) * r * lngPerPx,
				center.lat + Math.sin(angle) * r * latPerPx
			]);

			if (t < 1) {
				requestAnimationFrame(animate);
			} else {
				map.setCenter(center);
				resolve();
			}
		};

		requestAnimationFrame(animate);
	});
};
