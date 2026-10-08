<script lang="ts">
	import type { DialogDefinition, DialogProfile } from './dialog-registry';
	import LazyUploadComponent from './LazyUploadComponent.svelte';
	import { loadRemoteUploadFile, resolveUploadUrlInput } from '../data_menu/upload-url';

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
		remoteArcGisUrl: string | null;
		remoteStacUrl: string | null;
		remoteCswUrl: string | null;
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
		remoteArcGisUrl = $bindable(),
		remoteStacUrl = $bindable(),
		remoteCswUrl = $bindable(),
		pendingTileUrl = $bindable(),
		focusBbox = $bindable(),
		isDragover = false,
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();
	// カタログから選んだURLも、アップロード欄と同じ判定・フォームへ渡す。
	const importCatalogUrl = async (url: string, signal: AbortSignal) => {
		const resolved = await resolveUploadUrlInput(url);
		if (signal.aborted) return;
		if (resolved.type === 'error') throw new Error(resolved.message);
		if (resolved.type === 'remote-file') {
			const file = await loadRemoteUploadFile(resolved.requestUrl, signal);
			if (signal.aborted) return;
			showDataEntry = null;
			dropFile = [file];
			showDialogType = null;
			return;
		}
		if (resolved.target === 'remoteRasterUrl') remoteRasterUrl = resolved.value;
		if (resolved.target === 'remoteVectorUrl') remoteVectorUrl = resolved.value;
		if (resolved.target === 'pendingTileUrl') pendingTileUrl = resolved.value;
		if (resolved.target === 'remoteTiles3dUrl') remoteTiles3dUrl = resolved.value;
		if (resolved.target === 'remotePmtilesUrl') remotePmtilesUrl = resolved.value;
		if (resolved.target === 'remoteWmtsUrl') remoteWmtsUrl = resolved.value;
		if (resolved.target === 'remoteFeatureServiceUrl') remoteFeatureServiceUrl = resolved.value;
		if (resolved.target === 'remoteArcGisUrl') remoteArcGisUrl = resolved.value;
		if (resolved.target === 'remoteStacUrl') remoteStacUrl = resolved.value;
		if (resolved.target === 'remoteCswUrl') remoteCswUrl = resolved.value;
		if (resolved.target === 'remoteGeoZarrUrl') remoteGeoZarrUrl = resolved.value;
		showDialogType = resolved.dialogType;
	};
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
				bind:geoRefData
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
		{:else if profile === 'remote-csw'}
			<FormComponent bind:showDialogType bind:remoteCswUrl onimporturl={importCatalogUrl} />
		{:else if profile === 'remote-stac'}
			<FormComponent bind:showDataEntry bind:showDialogType bind:remoteStacUrl />
		{:else if profile === 'remote-arcgis'}
			<FormComponent bind:showDataEntry bind:showDialogType bind:remoteArcGisUrl />
		{:else if profile === 'remote-wmts'}
			<FormComponent bind:showDataEntry bind:showDialogType bind:remoteWmtsUrl />
		{:else if profile === 'remote-geozarr'}
			{#key dropFile}
				<FormComponent bind:showDataEntry bind:showDialogType bind:remoteGeoZarrUrl {dropFile} />
			{/key}
		{:else if profile === 'tiles'}
			<FormComponent
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:remoteRasterUrl
				bind:remoteVectorUrl
				bind:remoteTiles3dUrl
				bind:remotePmtilesUrl
			/>
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
