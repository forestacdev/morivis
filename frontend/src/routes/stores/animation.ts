// stores/animationManager.js
import { writable, derived, get } from 'svelte/store';

// ===== ストア定義 =====
export const isAnimationRunning = writable(false);
export const activeAnimationCount = writable(0);
export const currentFPS = writable(0);
export const showDebugInfo = writable(false); // デバッグ表示の切り替え

// 派生ストア：パフォーマンス情報
export const performanceInfo = derived(
	[isAnimationRunning, activeAnimationCount, currentFPS],
	([running, count, fps]) => ({
		running,
		count,
		fps,
		status: count === 0 ? 'idle' : fps > 50 ? 'good' : fps > 30 ? 'ok' : 'poor'
	})
);

// ===== AnimationManager クラス =====
class AnimationManager {
	// アニメーションコールバックのマップ
	animations: Map<string, (deltaTime: number, currentTime: number) => void>;
	// 最後の更新時間
	lastTime: number;
	// FPSカウンター
	fpsCounter: number;
	// 最後のFPS更新時間
	lastFpsTime: number;
	// アニメーションフレームID
	animationId: number | null;

	constructor() {
		this.animations = new Map();
		this.lastTime = 0;
		this.fpsCounter = 0;
		this.lastFpsTime = 0;
		this.animationId = null;
	}

	addAnimation(id: string, callback: (deltaTime: number, currentTime: number) => void) {
		// 既存のアニメーションがある場合は警告
		if (this.animations.has(id)) {
			console.warn(`Animation with id "${id}" already exists. Overwriting.`);
		}

		this.animations.set(id, callback);
		this.updateStores();

		if (!get(isAnimationRunning)) {
			this.start();
		}

		return () => this.removeAnimation(id); // cleanup関数を返す
	}

	removeAnimation(id: string) {
		const removed = this.animations.delete(id);
		this.updateStores();

		if (this.animations.size === 0) {
			this.stop();
		}

		return removed;
	}

	start() {
		if (get(isAnimationRunning)) return;

		isAnimationRunning.set(true);
		this.animate();
	}

	stop() {
		if (!get(isAnimationRunning)) return;

		isAnimationRunning.set(false);
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}

	pause() {
		this.stop();
	}

	resume() {
		if (this.animations.size > 0) {
			this.start();
		}
	}

	// ストアの更新
	updateStores() {
		activeAnimationCount.set(this.animations.size);
	}

	// FPS計算（デバッグ用）
	calculateFPS(currentTime: number) {
		if (!get(showDebugInfo)) return;

		this.fpsCounter++;
		if (currentTime - this.lastFpsTime >= 1000) {
			currentFPS.set(this.fpsCounter);
			this.fpsCounter = 0;
			this.lastFpsTime = currentTime;
		}
	}

	animate = (currentTime = 0) => {
		if (!get(isAnimationRunning)) return;

		const deltaTime = currentTime - this.lastTime;
		this.lastTime = currentTime;

		// FPS計算（デバッグモード時のみ）
		this.calculateFPS(currentTime);

		// すべてのアニメーションを実行
		this.animations.forEach((callback) => {
			try {
				callback(deltaTime, currentTime);
			} catch (error) {
				console.error('Animation callback error:', error);
			}
		});

		this.animationId = requestAnimationFrame(this.animate);
	};

	// 全アニメーションの一覧取得（デバッグ用）
	getAnimationIds() {
		return Array.from(this.animations.keys());
	}

	// アニメーション強制停止（緊急時用）
	forceStop() {
		this.animations.clear();
		this.stop();
		this.updateStores();
	}
}

// ===== シングルトンインスタンス =====
export const animationManager = new AnimationManager();

// ===== 便利なヘルパー関数 =====

// useAnimation: Svelte コンポーネント用フック
export function useAnimation(
	id: string,
	callback: (deltaTime: number, currentTime: number) => void
) {
	// 開発時の自動ID生成
	if (!id) {
		id = `anim_${Math.random().toString(36).substr(2, 9)}`;
	}

	const cleanup = animationManager.addAnimation(id, callback);

	return {
		id,
		cleanup,
		pause: () => animationManager.removeAnimation(id),
		resume: () => animationManager.addAnimation(id, callback)
	};
}

// デバッグモード切り替え
export function toggleDebugMode() {
	showDebugInfo.update((show) => !show);
}

// アニメーション統計情報
export const animationStats = derived(
	[activeAnimationCount, currentFPS, isAnimationRunning],
	([count, fps, running]) => {
		const memoryUsage = performance.memory
			? {
					used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
					total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
				}
			: null;

		return {
			activeAnimations: count,
			fps: running ? fps : 0,
			status: running ? 'running' : 'stopped',
			memoryUsage,
			efficiency: count > 0 ? Math.round((fps / count) * 10) / 10 : 0
		};
	}
);
