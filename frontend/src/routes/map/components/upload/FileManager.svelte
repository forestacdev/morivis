<script lang="ts">
	import JSZip from 'jszip';

	import { resolveDroppedFiles } from './upload-drop';
	import { applyUploadDropDecision, checkLargeDroppedFiles } from './upload-drop-actions';

	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
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
		transformOptionMode: TransformOptionMode;
		focusBbox: [number, number, number, number] | null;
	}

	let {
		map,
		isDragover = $bindable(),
		dropFile = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		transformOptionMode,
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
		// エントリー作成後に残った入力を再解析して同じフォームを開き直さない。
		if (showDataEntry) {
			dropFile = null;
			return;
		}

		// 位置合わせ中は入力を保持する。ここで同じ画像フォームを開き直すと、
		// GeoRef用のBlob URL生成が繰り返される。
		if (dropFile && !showDialogType && !transformOptionMode) {
			void setFile(dropFile);
		}
	});
</script>

<style>
</style>
