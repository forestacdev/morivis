<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { onDestroy } from 'svelte';

	import { mapStore } from '$routes/stores/map';

	interface Props {
		map: maplibregl.Map;
	}

	mapStore.onInitialized((map) => {});

	onDestroy(() => {
		const map = mapStore.getMap();
		if (!map) return;
	});
</script>

<div></div>

<style>
</style>
