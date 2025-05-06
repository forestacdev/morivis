<script lang="ts">
	import Icon from '@iconify/svelte';
	import Fuse from 'fuse.js';
	import type { Map as MapLibreMap } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { slide, fly } from 'svelte/transition';

	import Switch from '$routes/components/atoms/Switch.svelte';
	import { DATA_PATH } from '$routes/constants';
	import { geoDataEntries } from '$routes/data';
	import { addressSearch, addressCodeToAddress } from '$routes/data/api';
	import { demLayers, demEntry, type DemData } from '$routes/data/dem';
	import { propData } from '$routes/data/propData';
	import type { GeoDataEntry } from '$routes/data/types';
	import { showTerrainMenu, isTerrain3d } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import type { ResultData } from '$routes/utils/feature';
	import { type FeatureMenuData, type ClickedLayerFeaturesData } from '$routes/utils/geojson';
	import { getPropertiesFromPMTiles } from '$routes/utils/pmtiles';

	// interface Props {
	// 	layerEntries: GeoDataEntry[];
	// 	inputSearchWord: string;
	// 	featureMenuData: FeatureMenuData | null;
	// }

	// let {
	// 	layerEntries,
	// 	featureMenuData = $bindable(),
	// 	inputSearchWord = $bindable()
	// }: Props = $props();

	// const toggle3d = (e: any) => {
	// 	isTerrain3d.set(!$isTerrain3d);
	// };

	isTerrain3d.subscribe((is3d) => {
		const map = mapStore.getMap();
		if (!map) return;
		if (is3d) {
			map.setTerrain({
				source: 'terrain',
				exaggeration: 1.0
			});
			// map.setSourceTileLodParams(
			// 	2, // maxZoomLevelsOnScreen
			// 	3.0 // tileCountMaxMinRatio
			// );
			map.easeTo({ pitch: 60 });
		} else {
			map.setTerrain(null);
			// map.setSourceTileLodParams(
			// 	-1, // maxZoomLevelsOnScreen
			// 	-1 // tileCountMaxMinRatio
			// );
			map.easeTo({ pitch: 0 });
		}
	});

	let selectedDem = $state<DemData>(demLayers[0]);
	let demItems = $state<DemData[]>([...demLayers]);

	$effect(() => {
		demEntry.url = selectedDem.tiles[0];
		demEntry.demType = selectedDem.demType;
		demEntry.sourceMinZoom = selectedDem.minzoom;
		demEntry.sourceMaxZoom = selectedDem.maxzoom;
		demEntry.bbox = selectedDem.bbox;
		demEntry.attribution = selectedDem.attribution;
		mapStore.resetDem();
	});
</script>

<!-- メニュー -->
{#if $showTerrainMenu}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main w-side-menu absolute z-10 flex h-full flex-col gap-2"
	>
		<div class="flex items-center justify-between p-2">
			<span class="p-2 text-base text-lg">地形</span>
			<button
				onclick={() => {
					showTerrainMenu.set(false);
				}}
				class="bg-base rounded-full p-2"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
			</button>
		</div>

		<div
			class="c-scroll-hidden flex grow flex-col divide-y-2 overflow-y-auto overflow-x-hidden px-2 pb-4"
		>
			<Switch label="3D表示" bind:value={$isTerrain3d} />
			{#each demLayers as demItem}
				<label
					class="flex cursor-pointer items-center justify-between gap-2 p-2 text-left text-base {demItem.id ===
					selectedDem.id
						? 'bg-accent text-main'
						: ''}"
				>
					{demItem.name}
					<input
						type="radio"
						id={demItem.id}
						class="hidden"
						value={demItem}
						bind:group={selectedDem}
					/>
				</label>
			{/each}
		</div>

		<div
			class="c-fog pointer-events-none absolute bottom-0 z-10 flex h-[100px] w-full items-end justify-center pb-4"
		></div>
	</div>
{/if}

<style>
	.c-fog {
		background: rgb(233, 233, 233);
		background: linear-gradient(0deg, rgb(0, 93, 3) 10%, rgba(233, 233, 233, 0) 100%);
	}
</style>
