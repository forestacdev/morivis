<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';

	import { mapStore } from '$lib/store/map';

	let mapContainer;

	onMount(() => {
		const map = new maplibregl.Map({
			container: mapContainer,
			style: 'https://demotiles.maplibre.org/style.json',
			center: [139.767125, 35.681236],
			zoom: 13
		});

		map.on('load', () => {
			mapStore.setMap(map);
		});

		return () => {
			map.remove();
		};
	});
</script>

<div bind:this={mapContainer} style="width: 100%; height: 400px;"></div>

<style>
</style>
