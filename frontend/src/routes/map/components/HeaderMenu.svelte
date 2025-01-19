<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, GeoJSON } from 'geojson';
	import type { MapGeoJSONFeature } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import Geocoder from '$map/components/control/Geocoder.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import { showSideMenu } from '$map/store';
	import { mapStore } from '$map/store/map';

	type ResultData = {
		name: string;
		features: Feature<Geometry, GeoJsonProperties>[];
	};

	let results = $state<any | null>([]);

	onMount(() => {});

	let {
		layerEntries,
		sidePopupData = $bindable()
	}: { layerEntries: GeoDataEntry[]; sidePopupData: MapGeoJSONFeature | null } = $props();

	const focusFeature = (feature: any) => {
		console.log('focusFeature', feature);
		mapStore.focusFeature(feature);
		// mapStore.addSearchFeature(feature);
	};
</script>

<div
	class="pointer-events-none absolute left-0 top-0 z-20 flex w-full flex-grow items-center justify-start gap-2 p-2"
>
	<button
		class="bg-main pointer-events-auto rounded-full p-2 text-left"
		onclick={() => showSideMenu.set(true)}
	>
		<Icon icon="ic:round-menu" class="h-6 w-6" />
	</button>
	<Geocoder {layerEntries} bind:results />
</div>
{#if results}
	<div class="bg-main absolute left-2 top-[60px] z-20 w-[350px] overflow-y-auto rounded-md p-4">
		{#each results.filter((data) => data.features.length > 0) as result}
			{#each result.features as feature}
				<button
					onclick={() => focusFeature(feature)}
					class="flex w-full flex-col text-left text-black"
				>
					<span class="">{feature.properties.name}</span>
					<span class="text-xs">{result.name}</span>
				</button>
			{/each}
		{/each}
	</div>
{/if}

<style>
</style>
