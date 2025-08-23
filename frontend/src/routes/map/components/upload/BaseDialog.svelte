<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	import type { DialogType } from '$routes/map/types';
	import GeoTiffForm from '$routes/map/components/upload/form/GeoTiffForm.svelte';
	import GpxForm from '$routes/map/components/upload/form/GpxForm.svelte';
	import RasterForm from '$routes/map/components/upload/form/RasterForm.svelte';
	import ShapeFileForm from '$routes/map/components/upload/form/ShapeFileForm.svelte';
	import VectorForm from '$routes/map/components/upload/form/VectorForm.svelte';
	import WmtsForm from '$routes/map/components/upload/form/WmtsForm.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { type EpsgCode } from '$routes/map/utils/proj/dict';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDialogType: DialogType;
		tempLayerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
		dropFile: File | FileList | null;
		focusBbox: [number, number, number, number] | null; // フォーカスするバウンディングボックス
	}

	let {
		showDialogType = $bindable(),
		showDataEntry = $bindable(),
		tempLayerEntries = $bindable(),
		showZoneForm = $bindable(),
		selectedEpsgCode,
		dropFile = $bindable(),
		focusBbox = $bindable()
	}: Props = $props();
</script>

{#if showDialogType && showDialogType !== 'shp'}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black/50 {showZoneForm
			? 'pointer-events-none opacity-0'
			: ''}"
	>
		<div
			transition:scale={{ duration: 300, start: 0.9 }}
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
			{#if showDialogType === 'gpx'}
				<GpxForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
		</div>
	</div>
{/if}

{#if !$isProcessing}
	<ShapeFileForm
		bind:showDataEntry
		bind:showDialogType
		bind:dropFile
		bind:showZoneForm
		bind:focusBbox
		{selectedEpsgCode}
	/>
{/if}

<style>
</style>
