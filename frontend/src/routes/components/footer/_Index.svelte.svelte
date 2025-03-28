<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, GeoJSON } from 'geojson';
	import type { MapGeoJSONFeature } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import Attribution from '$routes/components/footer/Attribution.svelte';
	import Compass from '$routes/components/footer/Compass.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { mapStore } from '$routes/store/map';
	import { isPc } from '$routes/utils/ui';

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

{#if isPc()}
	<!-- PC -->
	<div
		class="pointer-events-none absolute bottom-0 left-0 z-20 flex h-[40px] w-full flex-grow items-center justify-start gap-2"
	>
		<Compass />
		<div class="absolute bottom-[40px] right-[60px] text-base font-bold">{zoom.toFixed(1)}</div>
		<Attribution />
	</div>
{:else}
	<!-- Mobile -->
	<div
		class="bottom-0 left-0 flex h-[70px] w-full flex-grow items-center justify-start gap-2"
	></div>
	<Compass />
{/if}

<style>
</style>
