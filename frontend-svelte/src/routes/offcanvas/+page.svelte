<script lang="ts">
	import { onMount } from 'svelte';
	import MapWorker from './map-worker?worker';

	let mapContainer: HTMLDivElement;
	let worker: Worker;

	onMount(() => {
		const canvas = document.createElement('canvas');
		const offscreenCanvas = canvas.transferControlToOffscreen();

		worker = new MapWorker();
		worker.postMessage(
			{
				canvas: offscreenCanvas,
				width: mapContainer.clientWidth,
				height: mapContainer.clientHeight,
				style: 'https://demotiles.maplibre.org/style.json'
			},
			[offscreenCanvas]
		);

		console.log('worker', worker);

		mapContainer.appendChild(canvas);

		return () => {
			worker.terminate();
		};
	});
</script>

<div bind:this={mapContainer} style="width: 100%; height: 400px;"></div>
