<script lang="ts">
	import { untrack } from 'svelte';

	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import { hasFormatExtension } from '$routes/map/utils/formats/format-definition';
	import type { NmeaResult } from '$routes/map/utils/formats/nmea';
	import { analyzeNmeaFile } from '$routes/map/utils/formats/nmea/analyze';
	import { formatNmea } from '$routes/map/utils/formats/nmea/definition';
	import { createNmeaEntry } from '$routes/map/utils/formats/nmea/entry';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';

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
	const extensions = [...new Set([...formatNmea.extensions, '.log', '.txt'])];
	const uploadFiles = $derived(toUploadFiles(dropFile));
	const files = $derived(uploadFiles.filter((item) => hasFormatExtension(item.name, extensions)));
	let fileInput = $state<HTMLInputElement | null>(null);
	let selection = $state.raw<{ batch: UploadFilesInput; index: number } | null>(null);
	const selectedIndex = $derived(selection && selection.batch === dropFile ? selection.index : 0);
	const file = $derived(files[selectedIndex] ?? files[0] ?? null);
	let parsedInput = $state.raw<{
		batch: UploadFilesInput;
		file: File;
		result: NmeaResult;
	} | null>(null);
	const result = $derived(
		parsedInput && parsedInput.batch === dropFile && parsedInput.file === file
			? parsedInput.result
			: null
	);
	let dataType = $state<'tracks' | 'track_points'>('tracks');
	const selectedData = $derived(result?.[dataType] ?? null);
	let name = $state('');
	let loading = $state(false);
	let error = $state('');
	let controller: AbortController | undefined;

	$effect(() => {
		const input = file;
		const batch = dropFile;
		const task = new AbortController();
		controller = task;
		parsedInput = null;
		dataType = 'tracks';
		name = input?.name.replace(/\.[^.]+$/, '') ?? '';
		error = '';
		loading = !!input;
		if (input) {
			untrack(() => {
				const release = beginUploadProcessing(task.signal);
				const isCurrent = () => !task.signal.aborted && file === input && dropFile === batch;
				void (async () => {
					try {
						const parsed = await analyzeNmeaFile(input, task.signal);
						if (!isCurrent()) return;
						parsedInput = { batch, file: input, result: parsed };
						dataType = parsed.tracks.features.length ? 'tracks' : 'track_points';
						if (!parsed.tracks.features.length && !parsed.track_points.features.length)
							error = '有効な測位データがありません';
					} catch (cause) {
						if (isCurrent())
							error = cause instanceof Error ? cause.message : 'NMEAを読み込めませんでした';
					} finally {
						release();
						if (isCurrent()) loading = false;
					}
				})();
			});
		}
		return () => task.abort();
	});

	const selectFile = (index: number) => {
		if (index === selectedIndex) return;
		controller?.abort();
		selection = { batch: dropFile, index };
	};
	const register = async () => {
		if (!selectedData?.features.length || !controller || loading) return;
		const input = file;
		const batch = dropFile;
		const signal = controller.signal;
		if (signal.aborted) return;
		const isCurrent = () => !signal.aborted && file === input && dropFile === batch;
		const release = beginUploadProcessing(signal);
		loading = true;
		error = '';
		try {
			const entry = await createNmeaEntry(selectedData, name.trim() || 'NMEA');
			if (!isCurrent()) {
				if (entry) GeojsonCache.remove(entry.id);
				return;
			}
			if (!entry) throw new Error('NMEAのエントリーを作成できませんでした');
			showDataEntry = entry;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			if (isCurrent())
				error = cause instanceof Error ? cause.message : 'NMEAを登録できませんでした';
		} finally {
			release();
			if (isCurrent()) loading = false;
		}
	};
	const cancel = () => {
		controller?.abort();
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">NMEA 0183</div>
<div class="c-scroll flex min-h-0 grow flex-col gap-4 overflow-y-auto text-sm">
	<p>RMC・GGA・GLLの位置情報を読み込みます。</p>
	<div class="flex flex-col items-start gap-2">
		<span>NMEAファイル</span>
		<button
			type="button"
			class="c-btn-confirm min-w-[180px] p-3 text-base"
			onclick={() => fileInput?.click()}
		>
			{uploadFiles.length > 0 ? 'ファイルを選び直す' : 'ファイルを選択'}
		</button>
		<input
			bind:this={fileInput}
			type="file"
			aria-label="NMEAファイル"
			accept={extensions.join(',')}
			class="hidden"
			multiple
			onchange={(event) => {
				const selected = event.currentTarget.files;
				if (selected?.length) {
					controller?.abort();
					dropFile = Array.from(selected);
					event.currentTarget.value = '';
				}
			}}
		/>
		{#if uploadFiles.length > 0}<p>選択済み: {uploadFiles.length.toLocaleString()}ファイル</p>{/if}
	</div>
	{#if files.length > 1}
		<label class="flex flex-col gap-2">
			読み込むファイル
			<select class="rounded bg-zinc-800 p-2" bind:value={() => selectedIndex, selectFile}>
				{#each files as item, index (item)}<option value={index}>{item.name}</option>{/each}
			</select>
		</label>
	{:else if file}
		<p class="break-all">{file.name}</p>
	{:else}
		<p>NMEAログを選択してください。</p>
	{/if}
	{#if result}
		<label class="flex flex-col gap-2">
			データ名
			<input class="rounded bg-zinc-800 p-2" bind:value={name} disabled={loading} />
		</label>
		<p>
			軌跡: {result.tracks.features.length.toLocaleString()}件 / 計測点: {result.track_points.features.length.toLocaleString()}件
		</p>
		{#if result.tracks.features.length || result.track_points.features.length}
			<label class="flex flex-col gap-2">
				表示対象
				<select class="rounded bg-zinc-800 p-2" bind:value={dataType} disabled={loading}>
					{#if result.tracks.features.length}<option value="tracks">軌跡</option>{/if}
					{#if result.track_points.features.length}<option value="track_points">計測点</option>{/if}
				</select>
			</label>
		{/if}
		{#if result.skippedSentences > 0}
			<p class="text-amber-200">読み取れなかった文: {result.skippedSentences.toLocaleString()}件</p>
		{/if}
		{#if result.invalidFixes > 0}
			<p class="text-amber-200">測位が無効のため除外: {result.invalidFixes.toLocaleString()}件</p>
		{/if}
		{#if result.unsupportedSentences > 0}
			<p>位置表示に使わない文: {result.unsupportedSentences.toLocaleString()}件</p>
		{/if}
	{/if}
	{#if loading}<p role="status">NMEAを処理しています…</p>{/if}
	{#if error}<p class="text-red-300" role="alert">{error}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button class="c-btn-sub cursor-pointer p-4 text-lg" onclick={cancel}>キャンセル</button>
	<button
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
		onclick={register}
		disabled={loading || !selectedData?.features.length}>登録</button
	>
</div>
