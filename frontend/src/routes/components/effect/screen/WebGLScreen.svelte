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

		window.addEventListener('resize', (event) => {
			worker.postMessage({
				type: 'resize',
				width: window.innerWidth,
				height: window.innerHeight
			});
		});
	});
</script>

<canvas bind:this={canvas} class="pointer-events-none absolute z-50 h-full w-full"></canvas>

<style>
</style>
