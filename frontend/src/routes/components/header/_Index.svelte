<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Map as MLMap } from 'maplibre-gl';

	import Geocoder from '$routes/components/header/Geocoder.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { showSideMenu, mapMode } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import type { ResultData } from '$routes/utils/feature';
	import { type FeatureMenuData } from '$routes/utils/geojson';
	import { getPropertiesFromPMTiles } from '$routes/utils/pmtiles';

	let results = $state<ResultData[] | null>([]);
	interface Props {
		layerEntries: GeoDataEntry[];

		featureMenuData: FeatureMenuData | null;
		inputSearchWord: string;
		map: MLMap;
	}

	let {
		layerEntries,
		featureMenuData = $bindable(),
		inputSearchWord = $bindable(),
		map
	}: Props = $props();

	// const focusFeature = (feature: any, layerId: string) => {
	// 	mapStore.focusFeature(feature);
	// 	const data: FeatureMenuData = {
	// 		type: 'Feature',
	// 		layerId: layerId,
	// 		properties: feature.properties,
	// 		geometry: feature.geometry,
	// 		featureId: feature.id
	// 	};
	// 	featureMenuData = data;
	// 	results = [];
	// };

	const focusFeature = async (result: ResultData) => {
		const prop = await getPropertiesFromPMTiles(
			'./fac_search.pmtiles',
			result.tile,
			result.layerId,
			result.featureId
		);

		const data: FeatureMenuData = {
			layerId: result.layerId,
			properties: prop,
			point: result.point,
			featureId: result.featureId
		};
		featureMenuData = data;
		results = [];
		mapStore.easeTo({
			center: result.point,
			zoom: 16
		});
	};
</script>

{#if $mapMode !== 'edit'}
	<div
		class="pointer-events-none absolute left-0 top-0 z-20 flex w-full flex-grow items-center justify-start gap-2 p-2"
	>
		<button
			class="bg-main pointer-events-auto rounded-full p-2 text-left text-base"
			onclick={() => showSideMenu.set(true)}
		>
			<Icon icon="ic:round-menu" class="h-6 w-6" />
		</button>
		<Geocoder {layerEntries} bind:results bind:inputSearchWord />
	</div>
	{#if results}
		<div
			class="bg-main absolute left-2 top-[60px] z-20 flex w-[350px] flex-col gap-2 overflow-y-auto rounded-md p-4"
		>
			{#each results as result}
				<button
					onclick={() => focusFeature(result)}
					class="flex w-full flex-col text-left text-base"
				>
					<span class="">{result.name}</span>
					<span class="text-xs">{result.name}</span>
				</button>
			{/each}
		</div>
	{/if}
{/if}

<style>
</style>
