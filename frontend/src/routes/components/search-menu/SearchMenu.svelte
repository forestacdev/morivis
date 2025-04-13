<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { slide, fly } from 'svelte/transition';

	import Geocoder from '$routes/components/search-menu/Geocoder.svelte';
	import { ENTRY_PMTILES_VECTOR_PATH } from '$routes/constants';
	import type { GeoDataEntry } from '$routes/data/types';
	import { selectedLayerId, isEdit, mapMode, showSearchMenu } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import type { ResultData } from '$routes/utils/feature';
	import { type FeatureMenuData, type ClickedLayerFeaturesData } from '$routes/utils/geojson';
	import { getPropertiesFromPMTiles } from '$routes/utils/pmtiles';
	interface Props {
		layerEntries: GeoDataEntry[];
		inputSearchWord: string;
		featureMenuData: FeatureMenuData | null;
	}

	let {
		layerEntries,
		featureMenuData = $bindable(),
		inputSearchWord = $bindable()
	}: Props = $props();

	let results = $state<ResultData[] | null>([]);

	const focusFeature = async (result: ResultData) => {
		// const prop = await getPropertiesFromPMTiles(
		// 	`${ENTRY_PMTILES_VECTOR_PATH}/fac_search.pmtiles`,
		// 	result.tile,
		// 	result.layerId,
		// 	result.featureId
		// );

		// const data: FeatureMenuData = {
		// 	layerId: result.layerId,
		// 	properties: prop,
		// 	point: result.point,
		// 	featureId: result.featureId
		// };
		// featureMenuData = data;

		mapStore.easeTo({
			center: result.point,
			zoom: 16
		});
	};

	$inspect('results', results);

	onMount(() => {});
</script>

<!-- レイヤーメニュー -->
{#if $showSearchMenu}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main absolute z-10 flex h-full w-[400px] flex-col gap-2"
	>
		<div class="flex items-center justify-between p-2">
			<Geocoder {layerEntries} bind:results bind:inputSearchWord></Geocoder>
			<button
				onclick={() => {
					showSearchMenu.set(false);
				}}
				class="bg-base rounded-full p-2"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
			</button>
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
						<span class="text-xs">{result.location}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
</style>
