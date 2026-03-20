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
