<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	import CsvForm from '$routes/map/components/upload/form/CsvForm.svelte';
	import DmForm from '$routes/map/components/upload/form/DmForm.svelte';
	import DxfForm from '$routes/map/components/upload/form/DxfForm.svelte';
	import GeoJsonForm from '$routes/map/components/upload/form/GeoJsonForm.svelte';
	import GeoTiffForm from '$routes/map/components/upload/form/GeoTiffForm.svelte';
	import GpkgForm from '$routes/map/components/upload/form/GpkgForm.svelte';
	import Hdf5Form from '$routes/map/components/upload/form/Hdf5Form.svelte';
	import GpxForm from '$routes/map/components/upload/form/GpxForm.svelte';
	import RasterForm from '$routes/map/components/upload/form/RasterForm.svelte';
	import ShapeFileForm from '$routes/map/components/upload/form/ShapeFileForm.svelte';
	import SimaForm from '$routes/map/components/upload/form/SimaForm.svelte';
	import Tiles3DForm from '$routes/map/components/upload/form/Tiles3DForm.svelte';
	import VectorForm from '$routes/map/components/upload/form/VectorForm.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import { type EpsgCode } from '$routes/map/utils/proj/dict';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDialogType: DialogType;
		tempLayerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
		dropFile: File | FileList | null;
		focusBbox: [number, number, number, number] | null;
		isDragover: boolean;
		zoneConfirmedEpsg: EpsgCode | null;
	}

	let {
		showDialogType = $bindable(),
		showDataEntry = $bindable(),
		tempLayerEntries = $bindable(),
		showZoneForm = $bindable(),
		selectedEpsgCode,
		dropFile = $bindable(),
		focusBbox = $bindable(),
		isDragover = $bindable(),
		zoneConfirmedEpsg = $bindable()
	}: Props = $props();

	let isFixedHeight = $derived(showDialogType === 'dxf' || showDialogType === 'dm');
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
			class="bg-opacity-8 bg-main flex max-w-[600px] grow flex-col rounded-md p-4 text-base {isFixedHeight
				? 'h-[600px]'
				: 'max-h-[600px]'}"
		>
			<!-- {#if showDialogType === 'wmts'}
				<WmtsForm bind:showDataEntry bind:showDialogType />
			{/if} -->
			{#if showDialogType === 'csv'}
				<CsvForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'raster'}
				<RasterForm bind:showDataEntry bind:showDialogType />
			{/if}
			{#if showDialogType === '3dtiles'}
				<Tiles3DForm bind:showDataEntry bind:showDialogType />
			{/if}
			{#if showDialogType === 'tiff'}
				<GeoTiffForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'vector'}
				<VectorForm bind:showDataEntry bind:showDialogType />
			{/if}
			{#if showDialogType === 'geojson'}
				<GeoJsonForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'gpx'}
				<GpxForm bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'dm'}
				<DmForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'dxf'}
				<DxfForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'gpkg'}
				<GpkgForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
			{#if showDialogType === 'hdf5'}
				<Hdf5Form bind:showDataEntry bind:showDialogType bind:dropFile />
			{/if}
			{#if showDialogType === 'sima'}
				<SimaForm
					bind:showDataEntry
					bind:showDialogType
					bind:dropFile
					bind:showZoneForm
					bind:focusBbox
					bind:zoneConfirmedEpsg
					{selectedEpsgCode}
				/>
			{/if}
		</div>
	</div>
{/if}

{#if !$isProcessing}
	<ShapeFileForm
		bind:showDataEntry
		bind:showDialogType
		bind:dropFile
		bind:isDragover
		bind:showZoneForm
		bind:focusBbox
		bind:zoneConfirmedEpsg
		{selectedEpsgCode}
	/>
{/if}

<style>
</style>
