<script lang="ts">
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import type { AisResult } from '$routes/map/utils/formats/ais';
	import { analyzeAisFile } from '$routes/map/utils/formats/ais/analyze';
	import { formatAis } from '$routes/map/utils/formats/ais/definition';
	import { createAisEntry } from '$routes/map/utils/formats/ais/entry';
	import { hasFormatExtension } from '$routes/map/utils/formats/format-definition';
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
	const extensions = formatAis.extensions;
	const uploadFiles = $derived(toUploadFiles(dropFile));
	const files = $derived(uploadFiles.filter((item) => hasFormatExtension(item.name, extensions)));
	let fileInput = $state<HTMLInputElement | null>(null);
	let selection = $state.raw<{ batch: UploadFilesInput; index: number } | null>(null);
	const selectedIndex = $derived(selection && selection.batch === dropFile ? selection.index : 0);
	const file = $derived(files[selectedIndex] ?? files[0] ?? null);
	let parsedInput = $state.raw<{
		batch: UploadFilesInput;
		file: File;
		result: AisResult;
	} | null>(null);
	const result = $derived(
		parsedInput && parsedInput.batch === dropFile && parsedInput.file === file
			? parsedInput.result
			: null
	);
	type AisDataType = 'tracks' | 'track_points';
	let dataType = $state<AisDataType>('tracks');
	const dataTypesOptions = $derived.by(() => {
		const options: { key: AisDataType; name: string }[] = [];
		if (result?.track_points.features.length)
			options.push({ key: 'track_points', name: 'ポイント' });
		if (result?.tracks.features.length) options.push({ key: 'tracks', name: 'ライン' });
		return options;
	});
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
						const parsed = await analyzeAisFile(input, task.signal);
						if (!isCurrent()) return;
						parsedInput = { batch, file: input, result: parsed };
						dataType = parsed.tracks.features.length ? 'tracks' : 'track_points';
						if (!parsed.tracks.features.length && !parsed.track_points.features.length)
							error = '有効な船舶の位置報告がありません';
					} catch (cause) {
						if (isCurrent())
							error = cause instanceof Error ? cause.message : 'AISを読み込めませんでした';
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
			const entry = await createAisEntry(selectedData, name.trim() || 'AIS');
			if (!isCurrent()) {
				if (entry) GeojsonCache.remove(entry.id);
				return;
			}
			if (!entry) throw new Error('AISのエントリーを作成できませんでした');
			showDataEntry = entry;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			if (isCurrent()) error = cause instanceof Error ? cause.message : 'AISを登録できませんでした';
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

<div class="shrink-0 pb-4 text-2xl font-bold">AISログ</div>
<div class="c-scroll flex min-h-0 grow flex-col gap-4 overflow-y-auto text-sm">
	<p>AISの位置報告を船舶ごとのポイント・航跡として読み込みます。</p>
	<div class="flex flex-col items-start gap-2">
		<span>AISファイル</span>
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
			aria-label="AISファイル"
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
		<p>AISログを選択してください。</p>
	{/if}
	{#if result}
		<label class="flex flex-col gap-2">
			データ名
			<input class="rounded bg-zinc-800 p-2" bind:value={name} disabled={loading} />
		</label>
		<p>船舶: {result.vesselCount.toLocaleString()}隻</p>
		<p>
			航跡: {result.tracks.features.length.toLocaleString()}件 / 位置報告: {result.track_points.features.length.toLocaleString()}件
		</p>
		{#if dataTypesOptions.length > 1}
			<fieldset class="min-w-0" disabled={loading}>
				<HorizontalSelectBox
					label="データタイプを選択"
					bind:group={dataType as string | number}
					options={dataTypesOptions}
				/>
			</fieldset>
		{:else if dataTypesOptions.length === 1}
			<p>読み込みタイプ: {dataTypesOptions[0].name}</p>
		{/if}
		{#if result.skippedSentences > 0}
			<p class="text-amber-200">読み取れなかった文: {result.skippedSentences.toLocaleString()}件</p>
		{/if}
		{#if result.invalidPositions > 0}
			<p class="text-amber-200">
				位置が無効のため除外: {result.invalidPositions.toLocaleString()}件
			</p>
		{/if}
		{#if result.unsupportedMessages > 0}
			<p>未対応のメッセージ: {result.unsupportedMessages.toLocaleString()}件</p>
		{/if}
		{#if result.incompleteMessages > 0}
			<p class="text-amber-200">
				断片がそろわず除外: {result.incompleteMessages.toLocaleString()}件
			</p>
		{/if}
		{#if result.untimedPoints > 0}
			<p>
				日時のない位置報告: {result.untimedPoints.toLocaleString()}件。記録順で扱い、時刻は推定しません。
			</p>
		{/if}
		{#if result.warnings.length > 0}
			<ul class="list-disc space-y-1 pl-5 text-amber-200">
				{#each [...new Set(result.warnings)] as warning (warning)}
					<li>{warning}</li>
				{/each}
			</ul>
		{/if}
	{/if}
	{#if loading}<p role="status">AISを処理しています…</p>{/if}
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
