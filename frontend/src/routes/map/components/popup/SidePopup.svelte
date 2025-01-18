<script lang="ts">
	import Icon from '@iconify/svelte';
	import type {
		StyleSpecification,
		MapGeoJSONFeature,
		SourceSpecification,
		CanvasSourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker,
		LngLat,
		Popup
	} from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import { propData } from '$map/data/propData';
	import { generatePopupTitle } from '$map/utils/properties';
	import type { GeoDataEntry } from '$map/data/types';
	import { showLayerOptionId, showSidePopup, mapMode, selectedHighlightData } from '$map/store';

	let {
		sidePopupData = $bindable(),
		layerEntries
	}: { sidePopupData: MapGeoJSONFeature | null; layerEntries: GeoDataEntry[] } = $props();

	let targetLayer = $derived.by(() => {
		if (sidePopupData) {
			const layer = layerEntries.find(
				(entry) => sidePopupData && entry.id === sidePopupData.layer.id
			);
			return layer;
		}
		return null;
	});

    let data = $derived.by(() => {
        if (sidePopupData) {
            return propData[sidePopupData.properties._prop_id];
        }
    });

	let srcData = $state<string | null>(null);

	onMount(() => {
		console.log('sidePopupData:', sidePopupData);
		if (sidePopupData) {
			console.log('sidePopupData:', sidePopupData);
			const layer = layerEntries.find(
				(entry) => sidePopupData && entry.id === sidePopupData.layer.id
			);
			if (layer && layer.type === 'vector' && data) {
                srcData = data.image ? data.image : './images/no_image.webp';
				console.log('srcData:', data);
			} else {
				srcData = './images/ensyurin.webp';
			}
		}
	});
</script>

{#if sidePopupData}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main absolute left-0 top-0 z-10 flex h-full w-[400px] flex-col gap-2 px-2 pt-[70px]"
	>
		<div class="relative aspect-video w-full overflow-hidden rounded-md">
			{#if srcData}
				<img
					transition:fade
					class="block h-full w-full object-cover"
					crossOrigin="anonymous"
					alt="画像"
					src={srcData}
				/>
			{/if}
		</div>
		<div class="flex items-center justify-between pt-12">
			<span class="text-lg font-bold">{sidePopupData.properties['小林班ID']}</span>
			<span class="">{targetLayer && targetLayer.type === 'vector'  ?  generatePopupTitle(sidePopupData.properties, targetLayer.properties.title): targetLayer.metaData.name}</span>
			<button onclick={() => (sidePopupData = null)} class="bg-base rounded-full p-2">
				<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
			</button>
		</div>
	</div>
{/if}

<style>
</style>
