<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	import type { DialogType } from '$routes/map/+page.svelte';
	import GeoTiffForm from '$routes/components/upload/form/GeoTiffForm.svelte';
	import GpxForm from '$routes/components/upload/form/GpxForm.svelte';
	import RasterForm from '$routes/components/upload/form/RasterForm.svelte';
	import ShapeFileForm from '$routes/components/upload/form/ShapeFileForm.svelte';
	import VectorForm from '$routes/components/upload/form/VectorForm.svelte';
	import WmtsForm from '$routes/components/upload/form/WmtsForm.svelte';
	import type { GeoDataEntry } from '$routes/data/types';

	interface Props {
		showDialogType: DialogType;
		tempLayerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
		dropFile: File | FileList | null;
	}

	let {
		showDialogType = $bindable(),
		showDataEntry = $bindable(),
		tempLayerEntries = $bindable(),
		dropFile = $bindable()
	}: Props = $props();
</script>

{#if showDialogType}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black/50"
	>
		<div
			transition:scale={{ duration: 300 }}
			class="bg-opacity-8 bg-main flex max-h-[600px] max-w-[600px] grow flex-col rounded-md p-4 text-base"
		>
			<!-- {#if showDialogType === 'wmts'}
				<WmtsForm bind:showDataEntry bind:showDialogType />
			{/if} -->
			{#if showDialogType === 'raster'}
				<RasterForm bind:showDataEntry bind:showDialogType />
			{/if}
			{#if showDialogType === 'tiff'}
				<GeoTiffForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'vector'}
				<VectorForm bind:showDataEntry bind:showDialogType />
			{/if}
			{#if showDialogType === 'shp'}
				<ShapeFileForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'gpx'}
				<GpxForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
		</div>
	</div>
{/if}

<style>
</style>
