<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly } from 'svelte/transition';

	import AttributeItem from '$routes/components/featureMenu/AttributeItem.svelte';
	import { propData } from '$routes/data/propData';
	import type { GeoDataEntry } from '$routes/data/types';
	import { mapStore } from '$routes/store/map';
	import type { FeatureMenuData } from '$routes/utils/geojson';
	import { generatePopupTitle } from '$routes/utils/properties';

	let {
		featureMenuData = $bindable(),
		layerEntries
	}: { featureMenuData: FeatureMenuData | null; layerEntries: GeoDataEntry[] } = $props();

	let showProp = $state<'metadata' | 'attributes'>('metadata');

	let targetLayer = $derived.by(() => {
		if (featureMenuData) {
			const layer = layerEntries.find(
				(entry) => featureMenuData && entry.id === featureMenuData.layerId
			);
			return layer;
		}
		return null;
	});

	let options = $derived.by(() => {
		if (featureMenuData && featureMenuData.properties && featureMenuData.properties._prop_id) {
			return [
				{ label: '概要', value: 'metadata' },
				{ label: '詳細データ', value: 'attributes' }
			];
		} else {
			return [{ label: '詳細データ', value: 'attributes' }];
		}
	});

	let data = $derived.by(() => {
		if (featureMenuData && featureMenuData.properties) {
			return propData[featureMenuData.properties._prop_id as string];
		} else {
			return null;
		}
	});

	let srcData = $derived.by(() => {
		if (featureMenuData) {
			const layer = layerEntries.find(
				(entry) => featureMenuData && entry.id === featureMenuData.layerId
			);
			if (layer && layer.type === 'vector' && data && data.image) {
				return data.image;
			}
		}
		return null;
	});

	const edit = () => {};

	$effect(() => {
		if (featureMenuData) {
			const map = mapStore.getMap();
			if (!map) return;
			const layer = map.getLayer(featureMenuData.layerId);
			if (!layer) return;
			const type: string = layer.type;
			if (
				type === 'raster' ||
				!featureMenuData.properties ||
				!featureMenuData.properties._prop_id
			) {
				showProp = 'metadata';
			} else {
				showProp = 'attributes';
			}
		}
	});

	$effect(() => {
		if (featureMenuData && featureMenuData.properties && featureMenuData.properties._prop_id) {
			showProp = 'metadata';
		} else {
			showProp = 'attributes';
		}
	});
</script>

{#if featureMenuData}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main absolute left-0 top-0 z-10 flex h-full w-[400px] flex-col gap-2 overflow-hidden px-2 pt-4"
	>
		<div class="flex w-full justify-between pb-2">
			<button onclick={() => (featureMenuData = null)} class="bg-base ml-auto rounded-full p-2">
				<Icon icon="material-symbols:close-rounded" class="text-main h-4 w-4" />
			</button>
		</div>
		{#if srcData}
			<div class="relative aspect-video w-full flex-shrink-0 overflow-hidden rounded-md">
				<img
					transition:fade
					class="block h-full w-full object-cover"
					crossOrigin="anonymous"
					alt="画像"
					src={srcData}
				/>
			</div>
		{/if}
		<div class="flex h-full flex-col gap-2">
			<!-- タイトル -->
			<div class="flex flex-shrink-0 flex-col gap-1 text-base">
				<span class="text-[22px] font-bold"
					>{targetLayer && targetLayer.type === 'vector' && targetLayer.properties.titles
						? generatePopupTitle(featureMenuData.properties, targetLayer.properties.titles)
						: ''}</span
				>
				<span class="text-[14px] text-gray-300"
					>{targetLayer && targetLayer.metaData.name ? targetLayer.metaData.name : ''}</span
				>
			</div>
			<!-- 切り替えタブ -->
			<div class="flex w-full flex-shrink-0 gap-2 p-2">
				{#each options as option}
					<label
						for={option.value}
						class="grid w-full flex-grow cursor-pointer select-none place-items-center rounded-full p-2 text-base transition-colors {showProp ===
						option.value
							? 'bg-gray-500'
							: ''}"
					>
						<input
							type="radio"
							bind:group={showProp}
							id={option.value}
							value={option.value}
							class="hidden"
						/>
						<span>{option.label}</span>
					</label>
				{/each}
			</div>
			<!-- 詳細情報 -->
			<div class="relative h-full w-full flex-col">
				{#if showProp === 'metadata'}
					<div
						transition:fly={{ duration: 200, x: 100 }}
						class="flex-grow' absolute flex h-full w-full flex-col gap-2"
					>
						<div class="flex w-full items-center justify-start gap-2">
							<Icon icon="lucide:map-pin" class="h-6 w-6 text-base" />
							<span class="text-accent"
								>{featureMenuData.point[0].toFixed(6)}, {featureMenuData.point[1].toFixed(6)}</span
							>
						</div>

						{#if data}
							{#if data.url}
								<a
									class="flex w-full items-center justify-start gap-2"
									href={data.url}
									target="_blank"
									rel="noopener noreferrer"
									><Icon icon="mdi:web" class="h-6 w-6 text-base" />
									<span class="text-accent">{data.url}</span></a
								>
							{/if}
						{/if}
						<div class="w-hull bg-base h-[1px] rounded-full"></div>
						{#if data}
							{#if data.description}
								<span class="text-base">{data.description}</span>
							{/if}
						{/if}
					</div>
				{:else if showProp === 'attributes'}
					<div
						transition:fly={{ duration: 200, x: 100 }}
						class="c-scroll absolute flex h-full w-full flex-grow flex-col gap-2 overflow-y-auto"
					>
						{#if featureMenuData.properties}
							{#each Object.entries(featureMenuData.properties) as [key, value]}
								{#if key !== '_prop_id'}
									<AttributeItem {key} {value} />
								{/if}
							{/each}
						{/if}
					</div>
				{/if}
			</div>
			<button
				onclick={edit}
				class="c-btn-confirm absolute bottom-2 right-2 z-10 flex items-center justify-center gap-2"
			>
				<Icon icon="ic:baseline-mode-edit-outline" class="h-6 w-6" />
				<span class="">レイヤーを編集</span>
			</button>
		</div>
	</div>
{/if}

<style>
</style>
