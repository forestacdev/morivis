<script lang="ts">
	import { onMount } from 'svelte';

	import { mapStore } from '$routes/store/map';

	let canvas = $state<HTMLCanvasElement | null>(null);

	onMount(() => {
		if (!canvas) {
			console.error('Canvas element not found');
			return;
		}
		const offscreen = canvas.transferControlToOffscreen();
		const worker = new Worker(new URL('./webgl-worker.ts', import.meta.url), {
			type: 'module'
		});

		worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);

		mapStore.onResize((e) => {
			const mapCanvas = mapStore.getCanvas();
			if (!mapCanvas) {
				console.error('Map canvas not found');
				return;
			}
			worker.postMessage({
				type: 'resize',
				width: mapCanvas.clientWidth,
				height: mapCanvas.clientHeight
			});
		});
	});
</script>

<canvas bind:this={canvas} class="pointer-events-none absolute h-full w-full"></canvas>

<style>
</style>
