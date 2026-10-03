<script lang="ts">
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import type { CzmlDataType, CzmlResult } from '$routes/map/utils/formats/czml';
	import { analyzeCzmlFile } from '$routes/map/utils/formats/czml/analyze';
	import { formatCzml } from '$routes/map/utils/formats/czml/definition';
	import { createCzmlEntry } from '$routes/map/utils/formats/czml/entry';
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
	const extensions = formatCzml.extensions;
	const uploadFiles = $derived(toUploadFiles(dropFile));
	const files = $derived(uploadFiles.filter((item) => hasFormatExtension(item.name, extensions)));
	let fileInput = $state<HTMLInputElement | null>(null);
	let selection = $state.raw<{ batch: UploadFilesInput; index: number } | null>(null);
	const selectedIndex = $derived(selection && selection.batch === dropFile ? selection.index : 0);
	const file = $derived(files[selectedIndex] ?? files[0] ?? null);
	let parsedInput = $state.raw<{
		batch: UploadFilesInput;
		file: File;
		result: CzmlResult;
	} | null>(null);
	const result = $derived(
		parsedInput && parsedInput.batch === dropFile && parsedInput.file === file
			? parsedInput.result
			: null
	);
	const typeOptions: { key: CzmlDataType; name: string }[] = [
		{ key: 'points', name: 'ポイント' },
		{ key: 'tracks', name: '軌跡' },
		{ key: 'lines', name: 'ライン' },
		{ key: 'polygons', name: 'ポリゴン' }
	];
	let dataType = $state<CzmlDataType>('points');
	const dataTypesOptions = $derived(
		typeOptions.filter((option) => result?.[option.key].features.length)
	);
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
		dataType = 'points';
		name = input?.name.replace(/\.[^.]+$/, '') ?? '';
		error = '';
		loading = !!input;
		if (input) {
			untrack(() => {
				const release = beginUploadProcessing(task.signal);
				const isCurrent = () => !task.signal.aborted && file === input && dropFile === batch;
				void (async () => {
					try {
						const parsed = await analyzeCzmlFile(input, task.signal);
						if (!isCurrent()) return;
						parsedInput = { batch, file: input, result: parsed };
						name = parsed.name || input.name.replace(/\.[^.]+$/, '');
						const firstType = typeOptions.find((option) => parsed[option.key].features.length);
						dataType = firstType?.key ?? 'points';
						if (!firstType) error = '表示できる位置・図形がありません';
					} catch (cause) {
						if (isCurrent())
							error = cause instanceof Error ? cause.message : 'CZMLを読み込めませんでした';
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
			const entry = await createCzmlEntry(selectedData, name.trim() || 'CZML');
			if (!isCurrent()) {
				if (entry) GeojsonCache.remove(entry.id);
				return;
			}
			if (!entry) throw new Error('CZMLのエントリーを作成できませんでした');
			showDataEntry = entry;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			if (isCurrent())
				error = cause instanceof Error ? cause.message : 'CZMLを登録できませんでした';
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

<div class="shrink-0 pb-4 text-2xl font-bold">CZML</div>
<div class="c-scroll flex min-h-0 grow flex-col gap-4 overflow-y-auto text-sm">
	<p>時刻付きの位置・軌跡・図形を読み込みます。</p>
	<div class="flex flex-col items-start gap-2">
		<span>CZMLファイル</span>
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
			aria-label="CZMLファイル"
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
		<p>CZMLファイルを選択してください。</p>
	{/if}
	{#if result}
		<label class="flex flex-col gap-2">
			データ名
			<input class="rounded bg-zinc-800 p-2" bind:value={name} disabled={loading} />
		</label>
		<p>
			ポイント: {result.points.features.length.toLocaleString()}件 / 軌跡: {result.tracks.features.length.toLocaleString()}件
			/ ライン: {result.lines.features.length.toLocaleString()}件 / ポリゴン: {result.polygons.features.length.toLocaleString()}件
		</p>
		<p>時刻: {result.timestamps.length.toLocaleString()}件</p>
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
		{#if result.warnings.length > 0}
			<ul class="list-disc space-y-1 pl-5 text-amber-200">
				{#each [...new Set(result.warnings)] as warning (warning)}
					<li>{warning}</li>
				{/each}
			</ul>
		{/if}
	{/if}
	{#if loading}<p role="status">CZMLを処理しています…</p>{/if}
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
