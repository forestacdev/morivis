<script lang="ts">
	import { onMount } from 'svelte';

	import { transitionPageScreen } from '$routes/stores/effect';

	interface props {
		initialized(): void;
	}

	let { initialized }: props = $props();
	let isWorkerInitialized = false;

	let container = $state<HTMLDivElement | null>(null);
	let canvas: HTMLCanvasElement | null = null;
	let worker: Worker | null = null;
	let terminateTimerId: number | null = null;

	const TERMINATE_DELAY_MS = 2000;

	const createCanvasAndWorker = () => {
		if (!container) {
			console.error('Container element not found');
			return null;
		}

		// 既存のcanvasがあれば削除
		if (canvas && canvas.parentNode) {
			canvas.parentNode.removeChild(canvas);
		}

		// 新しいcanvasを作成
		canvas = document.createElement('canvas');
		canvas.className = 'pointer-events-none fixed z-50 h-dvh w-full';
		container.appendChild(canvas);

		const offscreenCanvas = canvas.transferControlToOffscreen();

		const newWorker = new Worker(new URL('./webgl_effect.worker.ts', import.meta.url), {
			type: 'module'
		});

		newWorker.postMessage(
			{
				type: 'init',
				canvas: offscreenCanvas,
				width: window.innerWidth,
				height: window.innerHeight
			},
			[offscreenCanvas]
		);

		newWorker.onmessage = (event) => {
			const data = event.data;
			if (data.type === 'initialized') {
				initialized();
			} else if (data.type === 'log') {
				console.log('WebGL worker log:', data.message);
			}
		};

		newWorker.onerror = (error) => {
			console.error('WebGL worker error:', error);
		};

		if (import.meta.env.DEV) {
			console.log('Canvas and Worker created');
		}

		return newWorker;
	};

	const terminateWorker = () => {
		if (worker) {
			worker.terminate();
			worker = null;
			if (import.meta.env.DEV) {
				console.log('Worker terminated');
			}
		}
		// canvasも削除
		if (canvas && canvas.parentNode) {
			canvas.parentNode.removeChild(canvas);
			canvas = null;
		}
	};

	const scheduleTerminate = () => {
		cancelScheduledTerminate();
		terminateTimerId = window.setTimeout(() => {
			terminateWorker();
			terminateTimerId = null;
		}, TERMINATE_DELAY_MS);
	};

	const cancelScheduledTerminate = () => {
		if (terminateTimerId !== null) {
			clearTimeout(terminateTimerId);
			terminateTimerId = null;
		}
	};

	const ensureWorkerAndSend = (message: Record<string, unknown>) => {
		cancelScheduledTerminate();

		if (!worker) {
			worker = createCanvasAndWorker();
		}

		if (worker) {
			worker.postMessage(message);
		}
	};

	onMount(() => {
		if (!container) {
			console.error('Container element not found');
			return;
		}

		// 初回起動時はWorkerを作成しない（initialized callbackは即座に呼ぶ）
		initialized();

		const unsubscribe = transitionPageScreen.subscribe((transition) => {
			// 初回のsubscribe発火はスキップ
			if (!isWorkerInitialized) {
				isWorkerInitialized = true;
				return;
			}

			ensureWorkerAndSend({
				type: 'transition',
				animationFlag: transition
			});

			// 消失アニメーション終了後にWorkerを破棄
			if (transition === -1) {
				scheduleTerminate();
			}
		});

		const handleResize = () => {
			if (worker) {
				worker.postMessage({
					type: 'resize',
					width: window.innerWidth,
					height: window.innerHeight
				});
			}
		};

		window.addEventListener('resize', handleResize);

		return () => {
			unsubscribe();
			window.removeEventListener('resize', handleResize);
			cancelScheduledTerminate();
			terminateWorker();
		};
	});
</script>

<div bind:this={container} class="pointer-events-none fixed z-50 h-dvh w-full"></div>

<style>
</style>
