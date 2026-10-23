<script lang="ts">
	import type { UploadDialogState } from './dialog-props';
	import type { DialogLoader, LoadedUploadDialog } from './dialog-registry';
	import LazyUploadComponent from './LazyUploadComponent.svelte';
	import { loadRemoteUploadFile, resolveUploadUrlInput } from '../data_menu/upload-url';

	interface Props extends UploadDialogState {
		load: DialogLoader;
	}

	let {
		load,
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
	{#snippet children(form: LoadedUploadDialog)}
		{#if form.profile === 'simple'}
			<form.component bind:showDataEntry bind:showDialogType />
		{:else if form.profile === 'drop-file' || form.profile === 'side-panel'}
			<form.component bind:showDataEntry bind:showDialogType bind:dropFile />
		{:else if form.profile === 'model-georef'}
			<form.component
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:transformOptionMode
				bind:focusBbox
				bind:zoneConfirmedEpsg
				{selectedEpsgCode}
			/>
		{:else if form.profile === 'vector-zone'}
			<form.component
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:transformOptionMode
				bind:focusBbox
				bind:zoneConfirmedEpsg
				{selectedEpsgCode}
			/>
		{:else if form.profile === 'vector-zone-georef'}
			<form.component
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
		{:else if form.profile === 'vector-georef'}
			<form.component
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:transformOptionMode
				bind:focusBbox
				bind:geoRefData
			/>
		{:else if form.profile === 'raster-georef'}
			<form.component
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:transformOptionMode
				bind:geoRefData
			/>
		{:else if form.profile === 'pointcloud-georef'}
			<form.component
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:transformOptionMode
				bind:focusBbox
				bind:zoneConfirmedEpsg
				bind:geoRefData
				{selectedEpsgCode}
			/>
		{:else if form.profile === 'feature-service'}
			<form.component
				bind:showDataEntry
				bind:showDialogType
				bind:remoteFeatureServiceUrl
				bind:transformOptionMode
				bind:focusBbox
				bind:zoneConfirmedEpsg
				bind:pendingZoneGeoRefData
				{selectedEpsgCode}
			/>
		{:else if form.profile === 'remote-csw'}
			<form.component bind:showDialogType bind:remoteCswUrl onimporturl={importCatalogUrl} />
		{:else if form.profile === 'remote-stac'}
			<form.component bind:showDataEntry bind:showDialogType bind:remoteStacUrl />
		{:else if form.profile === 'remote-arcgis'}
			<form.component bind:showDataEntry bind:showDialogType bind:remoteArcGisUrl />
		{:else if form.profile === 'remote-wmts'}
			<form.component bind:showDataEntry bind:showDialogType bind:remoteWmtsUrl />
		{:else if form.profile === 'remote-geozarr'}
			{#key dropFile}
				<form.component bind:showDataEntry bind:showDialogType bind:remoteGeoZarrUrl {dropFile} />
			{/key}
		{:else if form.profile === 'tiles'}
			<form.component
				bind:showDataEntry
				bind:showDialogType
				bind:dropFile
				bind:remoteRasterUrl
				bind:remoteVectorUrl
				bind:remoteTiles3dUrl
				bind:remotePmtilesUrl
			/>
		{:else if form.profile === 'wcs'}
			<form.component bind:showDataEntry bind:showDialogType bind:dropFile />
		{:else if form.profile === 'tile-url-type'}
			<form.component
				bind:showDialogType
				bind:pendingTileUrl
				bind:remoteRasterUrl
				bind:remoteVectorUrl
			/>
		{/if}
	{/snippet}
</LazyUploadComponent>
