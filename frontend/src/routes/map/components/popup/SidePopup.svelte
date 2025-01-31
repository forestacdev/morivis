<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { MapGeoJSONFeature } from 'maplibre-gl';
	import { flip } from 'svelte/animate';
	import { readable } from 'svelte/store';
	import { fade, slide, fly } from 'svelte/transition';

	import { FEATURE_NO_IMAGE_PATH } from '$map/constants';
	import { fetchWikipediaImage } from '$map/data/api';
	import { propData } from '$map/data/propData';
	import type { GeoDataEntry } from '$map/data/types';
	import { editingLayerId, mapMode, selectedHighlightData, isEdit } from '$map/store';
	import type { SidePopupData } from '$map/utils/geojson';
	import { generatePopupTitle } from '$map/utils/properties';

	let {
		sidePopupData = $bindable(),
		layerEntries
	}: { sidePopupData: SidePopupData | null; layerEntries: GeoDataEntry[] } = $props();

	let showProp = $state<'metadata' | 'attributes'>('metadata');

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
		class="bg-main absolute left-0 top-0 z-10 flex h-full w-[400px] flex-col gap-2 overflow-hidden px-2 pt-4"
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
		<div class="flex h-full flex-col gap-2">
			<!-- タイトルを表示 -->
			<span class="flex-shrink-0 text-[22px] font-bold"
				>{targetLayer && targetLayer.type === 'vector' && targetLayer.properties.titles
					? generatePopupTitle(sidePopupData.properties, targetLayer.properties.titles)
					: ''}</span
			>
			<!-- ボタン -->
			<div class="flex w-full flex-shrink-0 gap-2 p-2">
				<button
					class="bg-accent w-full rounded-md p-2 text-white"
					onclick={() => {
						const id = sidePopupData.layerId;
						editingLayerId.set(id);

						mapMode.set('edit');
						$isEdit = true;
						// sidePopupData = null;
					}}
				>
					編集
				</button>
				<button
					class="bg-accent w-full rounded-md p-2 text-white"
					onclick={() => {
						showProp = 'metadata';
					}}
				>
					概要
				</button>
				<button
					class="bg-accent w-full rounded-md p-2 text-white"
					onclick={() => {
						showProp = 'attributes';
					}}
				>
					属性情報
				</button>
			</div>
			<!-- 詳細情報 -->
			<div class="relative h-full w-full flex-col">
				{#if showProp === 'metadata'}
					<div
						transition:fly={{ duration: 200, x: 100 }}
						class="flex-grow' absolute flex h-full w-full flex-col gap-2"
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
				{:else if showProp === 'attributes'}
					<div
						transition:fly={{ duration: 200, x: 100 }}
						class="css-scroll absolute flex h-full w-full flex-grow flex-col gap-2 overflow-y-auto"
					>
						{#if sidePopupData.properties}
							{#each Object.entries(sidePopupData.properties) as [key, value]}
								<div
									class="flex w-full items-center justify-start gap-2 border-b-2 border-gray-300"
								>
									<span class="text-accent flex-shrink-0">{key}</span>
									<span class="text-accent ml-auto">{value}</span>
								</div>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
</style>
