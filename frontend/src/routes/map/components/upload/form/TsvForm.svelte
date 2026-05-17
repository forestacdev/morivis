<script lang="ts">
	import DelimitedTextPointForm from '$routes/map/components/upload/form/DelimitedTextPointForm.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import { type EpsgCode } from '$routes/map/utils/proj/dict';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		showZoneForm = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable()
	}: Props = $props();
</script>

<DelimitedTextPointForm
	bind:showDataEntry
	bind:showDialogType
	bind:dropFile
	bind:showZoneForm
	bind:focusBbox
	bind:zoneConfirmedEpsg
	{selectedEpsgCode}
	formatName="TSV"
	dialogTypeValue="tsv"
	delimiter={'\t'}
	attribution="TSV"
/>
