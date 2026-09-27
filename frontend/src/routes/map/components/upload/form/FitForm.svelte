<script lang="ts">
	import { untrack } from 'svelte';

	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import type { FitDataType, FitParseResult } from '$routes/map/utils/formats/fit';
	import { analyzeFitFile } from '$routes/map/utils/formats/fit/analyze';
	import { createFitEntry } from '$routes/map/utils/formats/fit/entry';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}
	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();
	let parsed = $state.raw<FitParseResult | null>(null);
	let dataType = $state<FitDataType>('tracks');
	let busy = $state(false);
	let errorMessage = $state('');
	let controller: AbortController | undefined;
	const file = $derived(dropFile ? getFirstUploadFile(dropFile) : null);
	const types: { key: FitDataType; label: string }[] = [
		{ key: 'tracks', label: '軌跡（線）' },
		{ key: 'track_points', label: '計測点（時刻・標高・センサー値）' },
		{ key: 'waypoints', label: 'コースポイント' }
	];
	const options = $derived(types.filter((type) => (parsed?.[type.key].features.length ?? 0) > 0));

	const read = async (input: File, signal: AbortSignal) => {
		busy = true;
		parsed = null;
		errorMessage = '';
		const release = beginUploadProcessing(signal);
		try {
			const result = await analyzeFitFile(input, signal);
			if (signal.aborted) return;
			parsed = result;
			dataType = types.find((type) => result[type.key].features.length > 0)!.key;
		} catch (error) {
			if (!signal.aborted)
				errorMessage = error instanceof Error ? error.message : 'FITの読み込みに失敗しました';
		} finally {
			release();
			if (!signal.aborted) {
				busy = false;
			}
		}
	};
	$effect(() => {
		const input = file;
		const current = new AbortController();
		controller = current;
		if (input) untrack(() => void read(input, current.signal));
		return () => {
			current.abort();
		};
	});
	const register = async () => {
		if (!parsed || !file || busy || !controller) return;
		const signal = controller.signal;
		busy = true;
		errorMessage = '';
		const release = beginUploadProcessing(signal);
		try {
			const entry = await createFitEntry(parsed[dataType], file.name.replace(/\.fit$/i, ''));
			if (signal.aborted) {
				GeojsonCache.remove(entry.id);
				return;
			}
			showDataEntry = entry;
			showDialogType = null;
		} catch (error) {
			if (!signal.aborted)
				errorMessage = error instanceof Error ? error.message : 'FITの登録に失敗しました';
		} finally {
			release();
			if (!signal.aborted) {
				busy = false;
			}
		}
	};
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">FITファイルの登録</div>
<div class="c-scroll flex grow flex-col gap-4 overflow-y-auto p-2 text-sm">
	<p>GPSの軌跡や計測点を読み込みます。位置情報はそのまま地図上に配置されます。</p>
	{#if file}<p>{file.name}</p>{/if}
	{#if !file || errorMessage}
		<label class="flex flex-col gap-2">
			<span>FITファイルを選択</span>
			<input
				type="file"
				accept=".fit"
				disabled={busy}
				onchange={(event) => {
					dropFile = event.currentTarget.files?.[0] ?? null;
				}}
			/>
		</label>
	{/if}
	{#each options as option (option.key)}
		<label class="flex items-center gap-2">
			<input type="radio" bind:group={dataType} value={option.key} disabled={busy} />
			{option.label}（{parsed?.[option.key].features.length}件）
		</label>
	{/each}
	{#if parsed?.skippedRecords}
		<p>位置情報のない計測レコード {parsed.skippedRecords} 件を除外しました。</p>
	{/if}
	{#if busy}<p role="status">FITを処理しています…</p>{/if}
	{#if errorMessage}<p role="alert" class="text-red-300">{errorMessage}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-4">
	<button
		class="c-btn-sub p-4 text-lg"
		onclick={() => {
			dropFile = null;
			showDialogType = null;
		}}>キャンセル</button
	>
	<button
		class="c-btn-confirm min-w-[200px] p-4 text-lg"
		disabled={!parsed || busy}
		onclick={register}>決定</button
	>
</div>
