<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import { mapStore } from '$routes/stores/map';
	import { transitionPageScreen } from '$routes/stores/effect';

	interface props {
		initialized(): void;
	}

	let { initialized }: props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let worker: Worker | null = null;
	let resizeHandler: ((event: Event) => void) | null = null;

	onMount(() => {
		if (!canvas) {
			console.error('Canvas element not found');
			return;
		}
		const offscreen = canvas.transferControlToOffscreen();
		worker = new Worker(new URL('./webgl.worker.ts', import.meta.url), {
			type: 'module'
		});

		worker.postMessage(
			{ type: 'init', canvas: offscreen, width: window.innerWidth, height: window.innerHeight },
			[offscreen]
		);

		worker.onmessage = (event) => {
			const data = event.data;
			if (data.type === 'initialized') {
				initialized();
			} else if (data.type === 'log') {
				console.log('WebGL worker log:', data.message);
			}
		};
		worker.onerror = (error) => {
			console.error('WebGL worker error:', error);
		};

		const unsubscribeTransition = transitionPageScreen.subscribe((transition) => {
			if (worker) {
				worker.postMessage({
					type: 'transition',
					animationFlag: transition
				});
			}
		});

		resizeHandler = () => {
			if (worker) {
				worker.postMessage({
					type: 'resize',
					width: window.innerWidth,
					height: window.innerHeight
				});
			}
		};
		window.addEventListener('resize', resizeHandler);

		// クリーンアップ関数を返す
		return () => {
			unsubscribeTransition();
			if (resizeHandler) {
				window.removeEventListener('resize', resizeHandler);
			}
			if (worker) {
				worker.terminate();
				worker = null;
			}
		};
	});

	onDestroy(() => {
		if (resizeHandler) {
			window.removeEventListener('resize', resizeHandler);
		}
		if (worker) {
			worker.terminate();
			worker = null;
		}
	});
</script>

<canvas bind:this={canvas} class="pointer-events-none absolute z-50 h-full w-full"></canvas>

<style>
</style>
