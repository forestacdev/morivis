<script lang="ts">
	import turfBbox from '@turf/bbox';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { createGeoJsonEntry, geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import {
		garminGdbFileToGeojson,
		isGarminGdbFile,
		readGarminGdbFile,
		type GarminGdbDataType,
		type GarminGdbParseResult
	} from '$routes/map/utils/formats/garmin-gdb';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	let setFileName = $state<string>('');
	let isValidGarminGdb = $state(false);
	let parsed = $state<GarminGdbParseResult | null>(null);
	let dataType = $state<GarminGdbDataType>('waypoints');
	let dataTypeOptions = $state<{ key: GarminGdbDataType; name: string }[]>([]);

	const gdbFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const setFile = async (file: File) => {
		setFileName = file.name.replace(/\.gdb$/i, '');
		isProcessing.set(true);

		try {
			isValidGarminGdb = await isGarminGdbFile(file);
			if (!isValidGarminGdb) {
				showNotification('Garmin MapSource / BaseCamp の .gdb ではありません', 'error');
				cancel();
				return;
			}

			parsed = await readGarminGdbFile(file);
			const options: { key: GarminGdbDataType; name: string }[] = [];
			if (parsed.waypoints.length > 0) {
				options.push({ key: 'waypoints', name: `ウェイポイント (${parsed.waypoints.length})` });
			}
			if (parsed.routes.some((route) => route.coordinates.length >= 2)) {
				options.push({ key: 'routes', name: `ルート (${parsed.routes.length})` });
			}
			if (parsed.tracks.some((track) => track.points.length >= 2)) {
				options.push({ key: 'tracks', name: `トラック (${parsed.tracks.length})` });
			}
			dataTypeOptions = options;
			if (options.length > 0) {
				dataType = options[0].key;
			}
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'Garmin GDB の読み込みに失敗しました',
				'error'
			);
			cancel();
		} finally {
			isProcessing.set(false);
		}
	};

	$effect(() => {
		if (gdbFile) {
			setFile(gdbFile);
		}
	});

	const registration = async () => {
		if (!gdbFile || !isValidGarminGdb) return;
		isProcessing.set(true);

		try {
			const geojsonData = await garminGdbFileToGeojson(gdbFile, dataType);
			const entryType = geometryTypeToEntryType(geojsonData);
			if (!entryType) {
				showNotification('Garmin GDB からレイヤーを作成できませんでした', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			const entry = await createGeoJsonEntry(
				geojsonData,
				entryType,
				setFileName,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: 'Garmin GDB' }
			);

			if (!entry) {
				showNotification('Garmin GDB の登録に失敗しました', 'error');
				return;
			}

			entry.properties.attributeView.titles = [
				{
					conditions: ['name'],
					template: '{name}'
				}
			];

			showNotification('Garmin GDB を読み込みました', 'success');
			showDataEntry = entry;
			showDialogType = null;
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'Garmin GDB の変換に失敗しました',
				'error'
			);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
		isValidGarminGdb = false;
		parsed = null;
		dataTypeOptions = [];
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">Garmin GDBファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<div class="w-full space-y-4 p-2 text-sm">
		{#if parsed}
			<p>アプリケーション: {parsed.application}</p>
			<p>GDB バージョン: {parsed.version}.0</p>
			<p>
				ウェイポイント: {parsed.waypoints.length} / ルート: {parsed.routes.length} / トラック:
				{parsed.tracks.length}
			</p>
		{/if}
		{#if dataTypeOptions.length > 1}
			<HorizontalSelectBox
				label="読み込むデータタイプを選択"
				bind:group={dataType}
				bind:options={dataTypeOptions}
			/>
		{:else if dataTypeOptions.length === 1}
			<p>読み込みタイプ: {dataTypeOptions[0].name}</p>
		{/if}
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registration}
		disabled={!isValidGarminGdb || dataTypeOptions.length === 0}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg"
	>
		決定
	</button>
</div>
