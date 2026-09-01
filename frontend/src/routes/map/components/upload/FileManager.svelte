<script lang="ts">
	import JSZip from 'jszip';

	import { resolveDroppedFiles } from './upload-drop';
	import { applyUploadDropDecision, checkLargeDroppedFiles } from './upload-drop-actions';

	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFiles } from '$routes/map/types';
	import type maplibregl from '$routes/map/utils/maplibre';

	interface Props {
		map: maplibregl.Map;
		isDragover: boolean;
		dropFile: UploadFiles;
		tempLayerEntries: MorivisLayerEntry[];
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		focusBbox: [number, number, number, number] | null;
	}

	let {
		map,
		isDragover = $bindable(),
		dropFile = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		focusBbox = $bindable()
	}: Props = $props();

	const setFile = async (file: File | File[]) => {
		// 大きなファイルの確認
		if (!(await checkLargeDroppedFiles(file))) return;

		const decision = await resolveDroppedFiles(file);
		applyUploadDropDecision(decision, {
			map,
			setDropFile: (files) => {
				dropFile = files;
			},
			setShowDataEntry: (entry) => {
				showDataEntry = entry;
			},
			setShowDialogType: (dialogType) => {
				showDialogType = dialogType;
			}
		});
	};

	$effect(() => {
		if (dropFile && !showDialogType) {
			setFile(dropFile);
		}
	});
</script>

<style>
</style>
