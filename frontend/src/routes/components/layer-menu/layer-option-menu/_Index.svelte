<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import RasterOptionMenu from '$routes/components/layer-menu/layer-option-menu/RasterOptionMenu.svelte';
	import VectorOptionMenu from '$routes/components/layer-menu/layer-option-menu/VectorOptionMenu.svelte';
	import LayerSlot from '$routes/components/layer-menu/LayerSlot.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { selectedLayerId, isEdit } from '$routes/store';
	import { orderedLayerIds } from '$routes/store/layers';
	import { mapStore } from '$routes/store/map';

	let {
		layerEntry = $bindable(),
		tempLayerEntries = $bindable()
	}: { layerEntry: GeoDataEntry | undefined; tempLayerEntries: GeoDataEntry[] } = $props();

	onMount(() => {});
</script>

{#if $selectedLayerId && $isEdit && layerEntry}
	<div
		transition:fly={{ duration: 300, x: -50, opacity: 0 }}
		class="bg-main absolute top-0 z-30 flex h-full w-full flex-col p-2"
	>
		<div class="flex shrink-0 items-center justify-start gap-2 pb-2">
			<button onclick={() => isEdit.set(false)} class="bg-base grid items-center rounded-full p-2">
				<Icon icon="ep:back" class="text-main h-4 w-4" />
			</button>
			<span class="text-lg text-base">レイヤーの編集</span>
		</div>
		<LayerSlot bind:layerEntry bind:tempLayerEntries />
		<div class="c-scroll h-full grow overflow-x-hidden">
			{#if layerEntry.type === 'vector'}
				<VectorOptionMenu bind:layerEntry />
			{/if}

			{#if layerEntry.type === 'raster'}
				<RasterOptionMenu bind:layerEntry />
			{/if}
		</div>
	</div>
{/if}

<style>
</style>
