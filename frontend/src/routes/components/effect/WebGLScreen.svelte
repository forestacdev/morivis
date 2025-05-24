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

		mapStore.onMoveEvent(() => {
			const canvas = mapStore.getCanvas();
			if (!canvas) return;
		});
	});
</script>

<canvas bind:this={canvas} width="600" height="400"></canvas>

<style>
</style>
