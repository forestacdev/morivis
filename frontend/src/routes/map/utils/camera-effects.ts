/**
 * MapLibreカメラエフェクトユーティリティ
 * フォーカス演出・揺れ・回転などのカメラアニメーション
 */
import { mapStore } from '$routes/stores/map';

/** エフェクトのオプション */
interface ShakeOptions {
	/** 揺れの強さ（ピクセル相当の度数） デフォルト: 0.002 */
	intensity?: number;
	/** 揺れの回数 デフォルト: 6 */
	count?: number;
	/** 全体の時間(ms) デフォルト: 400 */
	duration?: number;
}

interface PulseZoomOptions {
	/** ズームイン量 デフォルト: 0.5 */
	zoomDelta?: number;
	/** 全体の時間(ms) デフォルト: 600 */
	duration?: number;
}

interface SwingOptions {
	/** 回転角度（度） デフォルト: 8 */
	angle?: number;
	/** 揺れの回数 デフォルト: 3 */
	count?: number;
	/** 全体の時間(ms) デフォルト: 800 */
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

/**
 * 横揺れエフェクト（衝撃・通知演出）
 */
export const shake = (options?: ShakeOptions): Promise<void> => {
	const pixelIntensity = options?.intensity ?? 7; // 揺れ幅（ピクセル）
	const count = options?.count ?? 6;
	const duration = options?.duration ?? 400;
	const map = mapStore.getMap();
	if (!map) return Promise.resolve();

	return new Promise((resolve) => {
		const center = map.getCenter();
		// 画面中心から指定ピクセル分ずらした座標との差分で、ズームに依存しない揺れ幅を算出
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

/**
 * パルスズームエフェクト（フォーカス演出）
 * 一瞬ズームインしてから元に戻る
 */
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
			easing: (t) => t * (2 - t) // ease-out
		});

		setTimeout(() => {
			map.easeTo({
				zoom: originalZoom,
				duration: half,
				easing: (t) => t * t // ease-in
			});
			setTimeout(() => resolve(), half);
		}, half);
	});
};

/**
 * 回転揺れエフェクト（スウィング）
 * bearing を左右に揺らして元に戻る
 */
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

interface VerticalShakeOptions {
	/** 揺れの強さ（ピクセル） デフォルト: 7 */
	intensity?: number;
	/** 揺れの回数 デフォルト: 6 */
	count?: number;
	/** 全体の時間(ms) デフォルト: 400 */
	duration?: number;
}

/**
 * 縦揺れエフェクト
 */
export const verticalShake = (options?: VerticalShakeOptions): Promise<void> => {
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

interface ImpactOptions {
	/** 打撃の強さ（ピクセル） デフォルト: 20 */
	intensity?: number;
	/** 打撃の方向（度、0=右、90=下） デフォルト: 90（下） */
	angle?: number;
	/** 全体の時間(ms) デフォルト: 300 */
	duration?: number;
}

/**
 * 打撃エフェクト（一瞬ガクッと動いて戻る）
 */
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

		// 一瞬ズレる
		map.easeTo({
			center: [center.lng + dLng, center.lat + dLat],
			duration: duration * 0.2,
			easing: (t) => t
		});

		// 元に戻る（バネ感）
		setTimeout(() => {
			map.easeTo({
				center: [center.lng, center.lat],
				duration: duration * 0.8,
				easing: (t) => {
					// ease-out elastic風
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

interface WhirlOptions {
	/** 円運動の半径（ピクセル） デフォルト: 15 */
	radius?: number;
	/** 全体の時間(ms) デフォルト: 400 */
	duration?: number;
}

/**
 * ぐるんエフェクト（中心点が円を描いて戻る）
 * 地図の向きは変えず、オフセットが一周する打撃感
 */
export const whirl = (options?: WhirlOptions): Promise<void> => {
	const radius = options?.radius ?? 15;
	const duration = options?.duration ?? 400;
	const map = mapStore.getMap();
	if (!map) return Promise.resolve();

	return new Promise((resolve) => {
		const center = map.getCenter();
		const cx = map.getCanvas().clientWidth / 2;
		const cy = map.getCanvas().clientHeight / 2;

		// 1px分の座標差分を算出
		const p0 = map.unproject([cx, cy]);
		const p1 = map.unproject([cx + 1, cy + 1]);
		const lngPerPx = Math.abs(p1.lng - p0.lng);
		const latPerPx = Math.abs(p1.lat - p0.lat);

		const startTime = performance.now();

		const animate = (now: number) => {
			const elapsed = now - startTime;
			const t = Math.min(elapsed / duration, 1);

			// 円を一周（ease-outで減衰）
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

interface RotationalVibrationOptions {
	/** 振動の半径（ピクセル） デフォルト: 8 */
	radius?: number;
	/** 1秒あたりの回転数 デフォルト: 20 */
	frequency?: number;
	/** 全体の時間(ms) デフォルト: 500 */
	duration?: number;
}

/**
 * ロータリーバイブレーション（高速円運動による振動感）
 */
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

			// 時間とともに減衰、高速回転
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

/**
 * ブリージングエフェクト（呼吸するようなズーム）
 * ゆっくりズームイン・アウトを繰り返す
 * 返り値の関数を呼ぶと停止
 */
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

		// ズームイン
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

			// ズームアウト
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
