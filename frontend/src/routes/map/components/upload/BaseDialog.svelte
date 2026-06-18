<script lang="ts">
	import { untrack } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	import { dialogRegistry } from '$routes/map/components/upload/dialog-registry';
	import DialogRenderer from '$routes/map/components/upload/DialogRenderer.svelte';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import ShapeFileForm from '$routes/map/components/upload/form/ShapeFileForm.svelte';
	import type { GeoRefData } from '$routes/map/components/upload/form/transform/georef-types';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFiles } from '$routes/map/types';
	import { type EpsgCode } from '$routes/map/utils/proj/dict';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDialogType: DialogType;
		tempLayerEntries: MorivisLayerEntry[];
		showDataEntry: MorivisLayerEntry | null;
		transformOptionMode: TransformOptionMode;
		selectedEpsgCode: EpsgCode;
		dropFile: UploadFiles;
		remoteGeoZarrUrl: string | null;
		remotePmtilesUrl: string | null;
		remoteRasterUrl: string | null;
		remoteVectorUrl: string | null;
		remoteTiles3dUrl: string | null;
		remoteWmtsUrl: string | null;
		remoteFeatureServiceUrl: string | null;
		pendingTileUrl: string | null;
		focusBbox: [number, number, number, number] | null;
		isDragover: boolean;
		zoneConfirmedEpsg: EpsgCode | null;
		pendingZoneGeoRefData: PendingZoneGeoRefData | null;
		geoRefData: GeoRefData | null;
	}

	let {
		showDialogType = $bindable(),
		showDataEntry = $bindable(),
		tempLayerEntries = $bindable(),
		transformOptionMode = $bindable(),
		selectedEpsgCode,
		dropFile = $bindable(),
		remoteGeoZarrUrl = $bindable(),
		remotePmtilesUrl = $bindable(),
		remoteRasterUrl = $bindable(),
		remoteVectorUrl = $bindable(),
		remoteTiles3dUrl = $bindable(),
		remoteWmtsUrl = $bindable(),
		remoteFeatureServiceUrl = $bindable(),
		pendingTileUrl = $bindable(),
		focusBbox = $bindable(),
		isDragover = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();

	const activeDialogDefinition = $derived(
		showDialogType && showDialogType !== 'shp' ? dialogRegistry[showDialogType] : null
	);
	let isFixedHeight = $derived(!!activeDialogDefinition?.fixedHeight);
	const isTransformOptionVisible = $derived(transformOptionMode === 'zone');
</script>

{#if activeDialogDefinition}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black/50 {isTransformOptionVisible
			? 'pointer-events-none opacity-0'
			: ''}"
	>
		<div
			transition:scale={{ duration: 300, start: 0.9 }}
			class="bg-opacity-8 bg-main flex max-w-[600px] grow flex-col rounded-md p-4 text-base {isFixedHeight
				? 'h-[600px]'
				: 'max-h-[700px]'}"
		>
			<DialogRenderer
				component={activeDialogDefinition.component}
				profile={activeDialogDefinition.profile}
				bind:showDataEntry
				bind:showDialogType
				bind:transformOptionMode
				bind:dropFile
				bind:remoteGeoZarrUrl
				bind:remotePmtilesUrl
				bind:remoteRasterUrl
				bind:remoteVectorUrl
				bind:remoteTiles3dUrl
				bind:remoteWmtsUrl
				bind:remoteFeatureServiceUrl
				bind:pendingTileUrl
				bind:focusBbox
				bind:zoneConfirmedEpsg
				bind:pendingZoneGeoRefData
				bind:geoRefData
				{selectedEpsgCode}
			/>
		</div>
	</div>
{/if}

{#if !$isProcessing}
	<ShapeFileForm
		bind:showDataEntry
		bind:showDialogType
		bind:dropFile
		bind:isDragover
		bind:transformOptionMode
		bind:focusBbox
		bind:zoneConfirmedEpsg
		bind:pendingZoneGeoRefData
		{selectedEpsgCode}
	/>
{/if}

<style>
</style>
