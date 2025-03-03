<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, GeoJSON } from 'geojson';
	import type { MapGeoJSONFeature } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import type { GeoDataEntry } from '$map/data/types';
	import { mapStore } from '$map/store/map';
	import Attribution from '$routes/map/components/footer/Attribution.svelte';
	import Compass from '$routes/map/components/footer/Compass.svelte';

	let zoom = $state(0);

	mapStore.onZoom((z) => {
		if (z) {
			zoom = z;
		}
	});

	onMount(() => {});

	let {
		layerEntries
	}: {
		layerEntries: GeoDataEntry[];
	} = $props();
</script>

<div
	class="absolute bottom-0 left-0 z-20 flex h-[40px] w-full flex-grow items-center justify-start gap-2"
>
	<!-- <Compass /> -->
	<div class="bg-accent absolute bottom-[30px] right-[20px]">{zoom.toFixed(1)}</div>
	<Attribution />
</div>

<style>
</style>
