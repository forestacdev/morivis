<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { LngLat } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import LayerIcon from '$map/components/LayerIcon.svelte';
	import { gsiGetElevation, lonLatToAddress } from '$map/data/api';
	import type { GeoDataEntry } from '$map/data/types';

	let {
		clickedLayerIds = $bindable(),
		layerEntries,
		clickedLngLat
	}: {
		clickedLayerIds: string[];
		layerEntries: GeoDataEntry[];
		clickedLngLat: LngLat | null;
	} = $props();

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
</script>

{#if clickedLayerIds.length > 0 && clickedLngLat}
	<div
		transition:fly={{ duration: 200, y: 100, opacity: 0 }}
		class="pointer-events-none absolute bottom-2 grid w-full place-items-center rounded-md"
	>
		<div
			class="pointer-events-auto relative flex max-w-[calc(100vw-2rem)] gap-2 rounded-md bg-white p-4 px-6 transition-all duration-100"
		>
			<button
				onclick={() => (clickedLayerIds = [])}
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
							><LayerIcon {layerEntry} />
						</button>
					{/each}
					<!-- 標高値の取得 -->
					<button
						class="duration-scale-100 relative grid h-[50px] w-[50px] flex-shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-gray-500 transition-all hover:scale-110"
						><div transition:fade={{ duration: 100 }} class="pointer-events-none absolute">
							<Icon
								icon="material-symbols:elevation-outline"
								class="pointer-events-none"
								width={30}
							/>
						</div>
					</button>
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
