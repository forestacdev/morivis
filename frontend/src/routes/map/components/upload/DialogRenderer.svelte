<script lang="ts">
	import type { DialogDefinition, DialogProfile } from './dialog-registry';
	import LazyUploadComponent from './LazyUploadComponent.svelte';

	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import type { GeoRefData } from '$routes/map/components/upload/form/transform/georef-types';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFiles } from '$routes/map/types';
	import { type EpsgCode } from '$routes/map/utils/proj/dict';

	interface Props {
		load: DialogDefinition['load'];
		profile: DialogProfile;
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
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
		load,
		profile,
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
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
		isDragover = false,
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();
</script>

<LazyUploadComponent
	{load}
	onclose={() => {
		showDialogType = null;
		dropFile = null;
	}}
>
	{#snippet children(FormComponent)}
		{#if profile === 'simple'}
			<FormComponent bind:showDataEntry bind:showDialogType />
		{:else if profile === 'drop-file' || profile === 'side-panel'}
			<FormComponent bind:showDataEntry bind:showDialogType bind:dropFile />
		{:else if profile === 'model-georef'}
			<FormComponent
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:transformOptionMode
				bind:focusBbox
				bind:zoneConfirmedEpsg
				{selectedEpsgCode}
			/>
		{:else if profile === 'vector-zone'}
			<FormComponent
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:transformOptionMode
				bind:focusBbox
				bind:zoneConfirmedEpsg
				{selectedEpsgCode}
			/>
		{:else if profile === 'vector-zone-georef'}
			<FormComponent
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:transformOptionMode
				bind:focusBbox
				bind:zoneConfirmedEpsg
				bind:pendingZoneGeoRefData
				{selectedEpsgCode}
				{isDragover}
			/>
		{:else if profile === 'vector-georef'}
			<FormComponent
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:transformOptionMode
				bind:focusBbox
				bind:geoRefData
			/>
		{:else if profile === 'raster-georef'}
			<FormComponent
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:transformOptionMode
				bind:geoRefData
			/>
		{:else if profile === 'pointcloud-georef'}
			<FormComponent
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:transformOptionMode
				bind:focusBbox
				bind:zoneConfirmedEpsg
				bind:geoRefData
				{selectedEpsgCode}
			/>
		{:else if profile === 'feature-service'}
			<FormComponent
				bind:showDataEntry
				bind:showDialogType
				bind:remoteFeatureServiceUrl
				bind:transformOptionMode
				bind:focusBbox
				bind:zoneConfirmedEpsg
				bind:pendingZoneGeoRefData
				{selectedEpsgCode}
			/>
		{:else if profile === 'remote-wmts'}
			<FormComponent bind:showDataEntry bind:showDialogType bind:remoteWmtsUrl />
		{:else if profile === 'remote-geozarr'}
			<FormComponent bind:showDataEntry bind:showDialogType bind:remoteGeoZarrUrl />
		{:else if profile === 'tiles'}
			<FormComponent
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:remoteRasterUrl
				bind:remoteVectorUrl
				bind:remoteTiles3dUrl
			/>
		{:else if profile === 'remote-pmtiles'}
			<FormComponent bind:showDataEntry bind:showDialogType bind:dropFile bind:remotePmtilesUrl />
		{:else if profile === 'wcs'}
			<FormComponent bind:showDataEntry bind:showDialogType bind:dropFile />
		{:else if profile === 'tile-url-type'}
			<FormComponent
				bind:showDialogType
				bind:pendingTileUrl
				bind:remoteRasterUrl
				bind:remoteVectorUrl
			/>
		{/if}
	{/snippet}
</LazyUploadComponent>
