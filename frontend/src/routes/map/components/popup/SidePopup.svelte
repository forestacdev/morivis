<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { MapGeoJSONFeature } from 'maplibre-gl';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import { FEATURE_NO_IMAGE_PATH } from '$map/constants';
	import { fetchWikipediaImage } from '$map/data/api';
	import { propData } from '$map/data/propData';
	import type { GeoDataEntry } from '$map/data/types';
	import { showLayerOptionId, showSidePopup, mapMode, selectedHighlightData } from '$map/store';
	import type { SidePopupData } from '$map/utils/geojson';
	import { generatePopupTitle } from '$map/utils/properties';

	let {
		sidePopupData = $bindable(),
		layerEntries
	}: { sidePopupData: SidePopupData | null; layerEntries: GeoDataEntry[] } = $props();

	let targetLayer = $derived.by(() => {
		if (sidePopupData) {
			const layer = layerEntries.find(
				(entry) => sidePopupData && entry.id === sidePopupData.layerId
			);
			return layer;
		}
		return null;
	});

	let data = $derived.by(() => {
		if (sidePopupData && sidePopupData.properties) {
			return propData[sidePopupData.properties._prop_id];
		}
	});

	let srcData = $derived.by(() => {
		if (sidePopupData) {
			const layer = layerEntries.find(
				(entry) => sidePopupData && entry.id === sidePopupData.layerId
			);
			if (layer && layer.type === 'vector' && data && data.image) {
				return data.image;
			}
		}
		return FEATURE_NO_IMAGE_PATH;
	});

	// TODO: 画像取得処理
	// const fetchImage = async () => {
	// 	const phenologyData = await fetchWikipediaImage('イタドリ');
	// 	return phenologyData;
	// };

	// const promise = (() => {
	// 	const layer = layerEntries.find(
	// 		(entry) => sidePopupData && entry.id === sidePopupData.layer.id
	// 	);
	// 	if (layer && layer.id === 'fac_phenology_2020') {
	// 		return fetchImage();
	// 	}
	// })();

	let featureType = $derived.by(() => {
		if (sidePopupData) {
			return sidePopupData.geometry.type;
		}
		return null;
	});
</script>

{#if sidePopupData}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main absolute left-0 top-0 z-10 flex h-full w-[400px] flex-col gap-2 px-2 pt-4"
	>
		<div class="flex w-full justify-between pb-2">
			<button onclick={() => (sidePopupData = null)} class="bg-base ml-auto rounded-full p-2">
				<Icon icon="material-symbols:close-rounded" class="text-main h-4 w-4" />
			</button>
		</div>
		<div class="relative aspect-video w-full overflow-hidden rounded-md">
			<img
				transition:fade
				class="block h-full w-full object-cover"
				crossOrigin="anonymous"
				alt="画像"
				src={srcData || FEATURE_NO_IMAGE_PATH}
			/>
			<!-- {#await promise then url}
				<img
					transition:fade
					class="block h-full w-full object-cover"
					crossOrigin="anonymous"
					alt="画像"
					src={url}
				/>
			{/await} -->
		</div>
		<div class="flex flex-col gap-2">
			<span class="text-[22px] font-bold"
				>{targetLayer && targetLayer.type === 'vector' && targetLayer.properties.titles
					? generatePopupTitle(sidePopupData.properties, targetLayer.properties.titles)
					: ''}</span
			>

			{#if featureType === 'Point' && sidePopupData.geometry}
				<div class="flex w-full items-center justify-start gap-2">
					<Icon icon="lucide:map-pin" class="h-6 w-6" />
					<span class="text-accent"
						>{sidePopupData.geometry.coordinates[0].toFixed(6)}, {sidePopupData.geometry.coordinates[1].toFixed(
							6
						)}</span
					>
				</div>
			{/if}
			{#if data}
				{#if data.url}
					<a
						class="flex w-full items-center justify-start gap-2"
						href={data.url}
						target="_blank"
						rel="noopener noreferrer"
						><Icon icon="mdi:web" class="h-6 w-6" />
						<span class="text-accent">{data.url}</span></a
					>
				{/if}
			{/if}
			<div class="w-hull bg-base h-[1px] rounded-full"></div>

			{#if data}
				{#if data.description}
					<span class="">{data.description}</span>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
</style>
