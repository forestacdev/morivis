<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, GeoJSON } from 'geojson';
	import type { MapGeoJSONFeature } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import type { GeoDataEntry } from '$routes/data/types';
	import { showSideMenu, mapMode, showDataMenu } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import { mapGeoJSONFeatureToSidePopupData, type SidePopupData } from '$routes/utils/geojson';
	import Geocoder from '$routes/components/header/Geocoder.svelte';

	interface ResultData {
		name: string;
		features: Feature<Geometry, { [key: string]: any }>[];
		layerId: string;
	}

	let results = $state<ResultData[] | null>([]);

	onMount(() => {});

	let {
		layerEntries,
		sidePopupData = $bindable(),
		inputSearchWord = $bindable()
	}: {
		layerEntries: GeoDataEntry[];
		sidePopupData: SidePopupData | null;
		inputSearchWord: string;
	} = $props();

	const focusFeature = (feature: any, layerId: string) => {
		mapStore.focusFeature(feature);
		const data: SidePopupData = {
			type: 'Feature',
			layerId: layerId,
			properties: feature.properties,
			geometry: feature.geometry,
			featureId: feature.id
		};
		sidePopupData = data;
		results = [];
	};
</script>

{#if $mapMode !== 'edit'}
	<div
		class="pointer-events-none absolute left-0 top-0 z-20 flex w-full flex-grow items-center justify-start gap-2 p-2"
	>
		<button
			class="bg-main pointer-events-auto rounded-full p-2 text-left"
			onclick={() => showSideMenu.set(true)}
		>
			<Icon icon="ic:round-menu" class="h-6 w-6" />
		</button>
		<Geocoder {layerEntries} bind:results bind:inputSearchWord />
	</div>
	{#if results}
		<div class="bg-main absolute left-2 top-[60px] z-20 w-[350px] overflow-y-auto rounded-md p-4">
			{#each results.filter((data) => data.features.length > 0) as result}
				{#each result.features as feature}
					<button
						onclick={() => focusFeature(feature, result.layerId)}
						class="flex w-full flex-col text-left text-black"
					>
						<span class="">{feature.properties.name}</span>
						<span class="text-xs">{result.name}</span>
					</button>
				{/each}
			{/each}
		</div>
	{/if}
{/if}

<style>
</style>
