<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import RasterOptionMenu from '$routes/components/layerMenu/layerOptionMenu/RasterOptionMenu.svelte';
	import VectorOptionMenu from '$routes/components/layerMenu/layerOptionMenu/VectorOptionMenu.svelte';
	import LayerSlot from '$routes/components/layerMenu/LayerSlot.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { selectedLayerId, addedLayerIds, isEdit } from '$routes/store';
	import { mapStore } from '$routes/store/map';

	let {
		layerToEdit = $bindable(),
		tempLayerEntries = $bindable()
	}: { layerToEdit: GeoDataEntry | undefined; tempLayerEntries: GeoDataEntry[] } = $props();

	onMount(() => {});
</script>

{#if $selectedLayerId && $isEdit && layerToEdit}
	<div
		transition:fly={{ duration: 300, y: -50, opacity: 0 }}
		class="bg-main absolute top-0 z-30 flex h-full w-full flex-col p-2"
	>
		<LayerSlot bind:layerEntry={layerToEdit} bind:tempLayerEntries />
		<div class="c-scroll h-full flex-grow overflow-x-hidden">
			{#if layerToEdit.type === 'vector'}
				<VectorOptionMenu bind:layerToEdit />
			{/if}

			{#if layerToEdit.type === 'raster'}
				<RasterOptionMenu bind:layerToEdit />
			{/if}
		</div>
	</div>
{/if}

<style>
</style>
