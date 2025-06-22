<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly } from 'svelte/transition';

	import AttributeItem from '$routes/components/feature-menu/AttributeItem.svelte';
	import { propData } from '$routes/data/propData';
	import type { GeoDataEntry } from '$routes/data/types';
	import { mapStore } from '$routes/store/map';
	import type { FeatureMenuData } from '$routes/utils/file/geojson';
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
		class="bg-main w-side-menu absolute left-0 top-0 z-20 flex h-full flex-col gap-2"
	>
		<div class="absolute top-0 z-10 flex w-full justify-between p-4 px-6">
			<button
				onclick={() => (featureMenuData = null)}
				class="bg-base ml-auto cursor-pointer rounded-full p-2 shadow-md"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
			</button>
		</div>
		<div class="c-scroll h-full overflow-y-auto overflow-x-hidden">
			<div class="relative w-full p-2">
				{#if srcData}
					<img
						in:fade
						class="block aspect-square h-full w-full rounded-lg object-cover"
						alt="画像"
						src={srcData}
					/>
				{:else}
					<div
						in:fade
						class="bg-sub grid aspect-square h-full w-full shrink-0 grow place-items-center overflow-hidden rounded-lg"
					>
						<Icon icon="material-symbols:photo" class="h-16 w-16 text-gray-400" />
					</div>
				{/if}
				<div
					class="c-gradient absolute bottom-0 left-0 flex h-full w-full shrink-0 grow flex-col justify-end gap-1 p-4 text-base"
				>
					<span class="text-[22px] font-bold"
						>{targetLayer &&
						targetLayer.type === 'vector' &&
						targetLayer.properties.titles.length &&
						featureMenuData.properties
							? generatePopupTitle(featureMenuData.properties, targetLayer.properties.titles)
							: targetLayer?.metaData.name}</span
					>
					<span class="text-[14px] text-gray-300"
						>{targetLayer && targetLayer.metaData.name ? targetLayer.metaData.name : ''}</span
					>
				</div>
			</div>

			<div class="pl-2">
				<!-- 詳細情報 -->

				<div class="flex h-full w-full flex-col gap-2">
					<div class="flex w-full justify-start gap-2">
						<Icon icon="lucide:map-pin" class="h-6 w-6 shrink-0 text-base" />
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
								><Icon icon="mdi:web" class="h-6 w-6 shrink-0 text-base" />
								<span class="text-accent">{data.url}</span></a
							>
						{/if}
					{/if}
					<div class="w-hull h-[1px] rounded-full bg-gray-400"></div>
					{#if data}
						{#if data.description}
							<span class="my-2 text-base">{data.description}</span>
							<div class="w-hull h-[1px] rounded-full bg-gray-400"></div>
						{/if}
					{/if}
				</div>

				<!-- 属性情報 -->

				<div class="mb-56 flex h-full w-full flex-col gap-2">
					<div class="my-4 text-base text-lg">属性情報</div>
					{#if featureMenuData.properties}
						{#each Object.entries(featureMenuData.properties) as [key, value]}
							{#if key !== '_prop_id' && value}
								<AttributeItem {key} {value} />
							{/if}
						{/each}
					{/if}
				</div>

				<!-- <button
				onclick={edit}
				class="c-btn-confirm absolute bottom-2 right-2 z-10 flex items-center justify-center gap-2"
			>
				<Icon icon="ic:baseline-mode-edit-outline" class="h-6 w-6" />
				<span class="">レイヤーを編集</span>
			</button> -->
			</div>
		</div>
	</div>
{/if}

<style>
	.c-gradient {
		background: linear-gradient(
			0deg,
			rgb(30, 30, 30) 0%,
			rgba(233, 233, 233, 0) 60%,
			rgba(233, 233, 233, 0) 100%
		);
	}
</style>
