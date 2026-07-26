<script lang="ts">
	import DelimitedTextPointForm from '$routes/map/components/upload/form/DelimitedTextPointForm.svelte';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { type EpsgCode } from '$routes/map/utils/proj/dict';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		pendingZoneGeoRefData: PendingZoneGeoRefData | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable()
	}: Props = $props();
</script>

<DelimitedTextPointForm
	bind:showDataEntry
	bind:showDialogType
	bind:dropFile
	bind:transformOptionMode
	bind:focusBbox
	bind:zoneConfirmedEpsg
	bind:pendingZoneGeoRefData
	{selectedEpsgCode}
	formatName="CSV"
	dialogTypeValue="csv"
	delimiter=","
	attribution="CSV"
/>
