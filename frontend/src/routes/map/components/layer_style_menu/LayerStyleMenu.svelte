<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import LayerSlot from '$routes/map/components/layer_menu/LayerSlot.svelte';
	import RasterOptionMenu from '$routes/map/components/layer_style_menu/RasterOptionMenu.svelte';
	import VectorOptionMenu from '$routes/map/components/layer_style_menu/VectorOptionMenu.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';
	import { orderedLayerIds } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';

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
	{#key layerEntry.id}
		<div
			in:fly={{ duration: 300, opacity: 0 }}
			out:fly={{ duration: 300, opacity: 0 }}
			class="bg-main w-style-menu pt-18 absolute top-0 flex h-full flex-col gap-2 overflow-hidden pl-[90px]"
		>
			<div class="flex h-full flex-col gap-2 overflow-auto">
				<div class="text-2xl text-base">{layerEntry.metaData.name}</div>
				<div class="flex items-center gap-2 border-t text-base"></div>
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
	{/key}
{/if}

<style>
</style>
