<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { LngLat } from 'maplibre-gl';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';

	import LayerIcon from '$routes/components/atoms/LayerIcon.svelte';
	import { HIGHLIGHT_LAYER_COLOR } from '$routes/constants';
	import { lonLatToAddress } from '$routes/data/api';
	import type { GeoDataEntry } from '$routes/data/types';
	import { mapStore } from '$routes/store/map';
	import { type FeatureMenuData, type ClickedLayerFeaturesData } from '$routes/utils/geojson';

	interface Props {
		clickedLayerIds: string[];
		clickedLayerFeaturesData: ClickedLayerFeaturesData[] | null;
		featureMenuData: FeatureMenuData | null;
		layerEntries: GeoDataEntry[];
		clickedLngLat: LngLat | null;
	}

	let {
		clickedLayerIds = $bindable(),
		clickedLayerFeaturesData = $bindable(),
		featureMenuData = $bindable(),
		layerEntries,
		clickedLngLat
	}: Props = $props();

	let address = $state<string | undefined>(undefined);
	let elevation = $state<number | undefined>(undefined);
	let selectedLayers = $derived.by(() => {
		if (!clickedLayerIds) return [];
		return layerEntries.filter((layer) => clickedLayerIds.includes(layer.id));
	});

	$effect(() => {
		(async () => {
			if (clickedLngLat) {
				address = await undefined;
				elevation = await undefined;
				address = await lonLatToAddress(clickedLngLat.lng, clickedLngLat.lat);
				// elevation = await gsiGetElevation(clickedLngLat.lng, clickedLngLat.lat);
			}
		})();
	});

	let selectedLayer = $state<{
		layerId: string;
		bool: boolean;
	}>({ layerId: '', bool: false });

	const showPopup = (layerId: string) => {
		if (!clickedLayerFeaturesData) return;
		const feature = clickedLayerFeaturesData.find(
			(data) => data.layerEntry.id === layerId
		)?.feature;
		if (!feature) return;

		clickedLayerFeaturesData = null;
		clickedLayerIds = [];
	};

	$effect(() => {
		if (selectedLayer.layerId && clickedLayerIds.length > 0) {
			const map = mapStore.getMap();
			if (!map) return;
			const layer = map.getLayer(selectedLayer.layerId);
			if (!layer) return;

			let type: string = layer.type;
			if (type === 'symbol') type = 'text';
			map.setPaintProperty(
				`@highlight_${selectedLayer.layerId}`,
				`${type}-color`,
				selectedLayer.bool ? '#00d5ff' : HIGHLIGHT_LAYER_COLOR
			);

			map.moveLayer(`@highlight_${selectedLayer.layerId}`);
		}
	});
</script>

{#if clickedLayerIds.length > 1 && clickedLngLat}
	<div
		transition:fly={{ duration: 200, y: 100, opacity: 0 }}
		class="pointer-events-none absolute bottom-2 grid w-full place-items-center rounded-md"
	>
		<div
			class="pointer-events-auto relative flex max-w-[calc(100vw-2rem)] gap-2 rounded-md bg-white p-4 px-6 transition-all duration-100"
		>
			<button
				onclick={() => {
					clickedLayerFeaturesData = null;
					clickedLayerIds = [];
				}}
				class="absolute right-0 top-0 rounded-full p-2"
			>
				<Icon icon="material-symbols:close-rounded" class="h-4 w-4 text-black" />
			</button>
			<div class="flex flex-grow flex-col gap-2">
				<div class="flex gap-2">
					{#each selectedLayers as layerEntry (layerEntry.id)}
						<button
							animate:flip={{ duration: 200 }}
							class="duration-scale-100 relative grid h-[50px] w-[50px] flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-gray-500 transition-all hover:scale-110"
							onclick={() => showPopup(layerEntry.id)}
							onmousemove={() => (selectedLayer = { layerId: layerEntry.id, bool: true })}
							onmouseleave={() => (selectedLayer = { layerId: layerEntry.id, bool: false })}
							><LayerIcon {layerEntry} />
						</button>
					{/each}
					<!-- 標高値の取得 -->
					<!-- <button
						class="duration-scale-100 relative grid h-[50px] w-[50px] flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-gray-500 transition-all hover:scale-110"
						><div transition:fade={{ duration: 100 }} class="pointer-events-none absolute">
							<Icon
								icon="material-symbols:elevation-outline"
								class="pointer-events-none"
								width={30}
							/>
						</div>
					</button> -->
					<!-- TODO: 他の地図にアクセス -->
					<!-- <button
						class="duration-scale-100 relative grid h-[50px] w-[50px] flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-gray-500 transition-all hover:scale-110"
						><div transition:fade={{ duration: 100 }} class="pointer-events-none absolute">
							<Icon icon="simple-icons:googlemaps" class="pointer-events-none" width={30} />
						</div>
					</button>
					<button
						class="duration-scale-100 relative grid h-[50px] w-[50px] flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-gray-500 transition-all hover:scale-110"
						><div transition:fade={{ duration: 100 }} class="pointer-events-none absolute">
							<Icon icon="arcticons:osm-go" class="pointer-events-none" width={30} />
						</div>
					</button> -->
				</div>
				<div class="flex w-full flex-col items-center justify-center">
					<span class="text-accent text-xs"
						>{clickedLngLat.lng.toFixed(6)}, {clickedLngLat.lat.toFixed(6)}</span
					>

					<span class="text-xs">{address ?? '-----'}</span>
					<!-- <span class="text-xs">標高{elevation ?? '---'}m</span> -->
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
</style>
