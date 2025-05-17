<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import LayerSlot from '$routes/components/layer-menu/LayerSlot.svelte';
	import RasterOptionMenu from '$routes/components/layer-style-menu/RasterOptionMenu.svelte';
	import VectorOptionMenu from '$routes/components/layer-style-menu/VectorOptionMenu.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { selectedLayerId, isStyleEdit } from '$routes/store';
	import { orderedLayerIds } from '$routes/store/layers';
	import { mapStore } from '$routes/store/map';

	interface Props {
		layerEntry: GeoDataEntry | null;
		tempLayerEntries: GeoDataEntry[];
	}

	let { layerEntry = $bindable(), tempLayerEntries = $bindable() }: Props = $props();

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			layerEntry = null;
		}
	};
</script>

<svelte:window on:keydown={handleKeydown} />

{#if layerEntry}
	<div
		transition:fly={{ duration: 200, x: -100, opacity: 0 }}
		class="bg-main w-side-menu absolute left-0 top-0 z-20 flex h-full flex-col gap-2 overflow-hidden px-2 pt-4"
	>
		<div class="flex w-full cursor-pointer items-center gap-4 pb-2">
			<span class="text-base">スタイルの編集</span>
			<button
				onclick={() => ($isStyleEdit = false)}
				class="bg-base ml-auto cursor-pointer rounded-full p-2"
			>
				<Icon icon="material-symbols:close-rounded" class="text-main h-4 w-4" />
			</button>
		</div>

		<div class="flex h-full flex-col gap-2 overflow-auto">
			<div class="text-2xl text-base">{layerEntry.metaData.name}</div>
			<div class="flex items-center gap-2 border-t p-2 text-base"></div>
			<div class="c-scroll h-full grow overflow-x-hidden">
				{#if layerEntry.type === 'vector'}
					<VectorOptionMenu bind:layerEntry />
				{/if}

				{#if layerEntry.type === 'raster'}
					<RasterOptionMenu bind:layerEntry />
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
</style>
