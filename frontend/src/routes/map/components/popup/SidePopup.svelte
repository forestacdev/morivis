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

	import type { GeoDataEntry } from '$map/data/types';
	import { showLayerOptionId, showSidePopup, mapMode, selectedHighlightData } from '$map/store';

	let {
		sidePopupData = $bindable(),
		layerEntries
	}: { sidePopupData: MapGeoJSONFeature | null; layerEntries: GeoDataEntry[] } = $props();

	let targetLayer = $derived.by(() => {
		if (sidePopupData) {
			console.log(sidePopupData);
			const layer = layerEntries.find(
				(entry) => sidePopupData && entry.id === sidePopupData.layer.id
			);
			return layer;
		}
		return null;
	});
</script>

{#if sidePopupData}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main absolute left-0 top-0 z-10 flex h-full w-[400px] flex-col gap-2 p-2"
	>
		<img
			src="https://raw.githubusercontent.com/forestacdev/ensyurin-webgis-data/refs/heads/main/images/popup/tettouc.jpg"
			alt="popup"
			class=""
		/>
		<div class="flex items-center justify-between pt-12">
			<span class="text-lg font-bold">{targetLayer ? targetLayer.metaData.name : ''}</span>
			<button onclick={() => (sidePopupData = null)} class="bg-base rounded-full p-2">
				<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
			</button>
		</div>
	</div>
{/if}

<style>
</style>
