<script lang="ts">
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import type { CzmlDataType, CzmlResult } from '$routes/map/utils/formats/czml';
	import { analyzeCzmlFile } from '$routes/map/utils/formats/czml/analyze';
	import { createCzmlEntry } from '$routes/map/utils/formats/czml/entry';
	import { isCzmlFile } from '$routes/map/utils/formats/czml/files';
	import { createCzmlModelEntry } from '$routes/map/utils/formats/czml/model-entry';
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
	let sourceMode = $state<'file' | 'text'>('file');
	let inputText = $state('');
	let manualEntryName = $state('');
	let parsedText = $state.raw<{ text: string; file: File; result: CzmlResult } | null>(null);
	const uploadFiles = $derived(toUploadFiles(dropFile));
	let detectedInput = $state.raw<{
		batch: UploadFilesInput;
		files: File[];
		error: string;
	} | null>(null);
	const files = $derived(
		detectedInput && detectedInput.batch === dropFile ? detectedInput.files : []
	);
	const detectionError = $derived(
		sourceMode === 'file' && detectedInput && detectedInput.batch === dropFile
			? detectedInput.error
			: ''
	);
	let fileInput = $state<HTMLInputElement | null>(null);
	let selection = $state.raw<{ batch: UploadFilesInput; index: number } | null>(null);
	const selectedIndex = $derived(selection && selection.batch === dropFile ? selection.index : 0);
	const file = $derived(files[selectedIndex] ?? files[0] ?? null);
	let parsedInput = $state.raw<{
		batch: UploadFilesInput;
		file: File;
		result: CzmlResult;
	} | null>(null);
	const result = $derived.by(() => {
		if (sourceMode === 'text')
			return parsedText && parsedText.text === inputText ? parsedText.result : null;
		return parsedInput && parsedInput.batch === dropFile && parsedInput.file === file
			? parsedInput.result
			: null;
	});
	type DisplayType = CzmlDataType | 'models';
	const typeOptions: { key: DisplayType; name: string }[] = [
		{ key: 'models', name: '3Dモデル' },
		{ key: 'points', name: 'ポイント' },
		{ key: 'tracks', name: '軌跡' },
		{ key: 'lines', name: 'ライン' },
		{ key: 'polygons', name: 'ポリゴン' }
	];
	const dataCount = (data: CzmlResult, type: DisplayType) =>
		type === 'models' ? data.models.length : data[type].features.length;
	let dataType = $state<DisplayType>('points');
	const dataTypesOptions = $derived(
		typeOptions.filter((option) => result && dataCount(result, option.key) > 0)
	);
	const selectedData = $derived(dataType === 'models' ? null : (result?.[dataType] ?? null));
	const canRegister = $derived(
		dataType === 'models' ? !!result?.models.length : !!selectedData?.features.length
	);
	let name = $state('');
	let loading = $state(false);
	let discovering = $state(false);
	const busy = $derived(loading || discovering);
	let error = $state('');
	let controller: AbortController | undefined;
	let observedBatch: UploadFilesInput = null;

	$effect(() => {
		const batch = dropFile;
		if (batch !== observedBatch) {
			observedBatch = batch;
			if (batch) sourceMode = 'file';
		}
	});

	$effect(() => {
		const mode = sourceMode;
		const batch = dropFile;
		const inputs = uploadFiles;
		const task = new AbortController();
		detectedInput = null;
		discovering = mode === 'file' && inputs.length > 0;
		if (mode === 'file' && inputs.length) {
			untrack(() => {
				const release = beginUploadProcessing(task.signal);
				void (async () => {
					try {
						const matches = await Promise.all(inputs.map((input) => isCzmlFile(input)));
						if (task.signal.aborted || dropFile !== batch) return;
						const candidates = inputs.filter((_, index) => matches[index]);
						detectedInput = {
							batch,
							files: candidates,
							error: candidates.length
								? ''
								: 'CZMLファイルが見つかりません。関連ファイルと一緒に選択してください。'
						};
					} catch (cause) {
						if (!task.signal.aborted && dropFile === batch)
							detectedInput = {
								batch,
								files: [],
								error: cause instanceof Error ? cause.message : 'CZMLファイルを確認できませんでした'
							};
					} finally {
						release();
						if (!task.signal.aborted && dropFile === batch) discovering = false;
					}
				})();
			});
		}
		return () => task.abort();
	});

	$effect(() => {
		if (sourceMode !== 'file') return;
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
				const isCurrent = () =>
					!task.signal.aborted && sourceMode === 'file' && file === input && dropFile === batch;
				void (async () => {
					try {
						const parsed = await analyzeCzmlFile(input, task.signal);
						if (!isCurrent()) return;
						parsedInput = { batch, file: input, result: parsed };
						name = parsed.name || input.name.replace(/\.[^.]+$/, '');
						const firstType = typeOptions.find((option) => dataCount(parsed, option.key) > 0);
						dataType = firstType?.key ?? 'points';
						if (!firstType) error = '表示できる位置・図形・モデルがありません';
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

	$effect(() => {
		if (sourceMode !== 'text') return;
		// テキストの変更で結果を破棄する。解析は登録操作から開始する。
		void inputText;
		const task = new AbortController();
		controller = task;
		parsedText = null;
		loading = false;
		error = '';
		return () => task.abort();
	});

	const selectFile = (index: number) => {
		if (index === selectedIndex) return;
		controller?.abort();
		selection = { batch: dropFile, index };
	};
	const register = async () => {
		if (!controller || busy) return;
		const mode = sourceMode;
		const text = inputText;
		if (mode === 'text' ? !text.trim() : !result || !file || !canRegister) return;
		const input =
			mode === 'text'
				? parsedText?.text === text
					? parsedText.file
					: new File([text], 'input.czml', { type: 'application/json' })
				: file;
		if (!input) return;
		const batch = dropFile;
		const signal = controller.signal;
		if (signal.aborted) return;
		const isCurrent = () =>
			!signal.aborted &&
			sourceMode === mode &&
			dropFile === batch &&
			(mode === 'text' ? inputText === text : file === input);
		const release = beginUploadProcessing(signal);
		loading = true;
		error = '';
		try {
			let parsed = result;
			let type = dataType;
			if (mode === 'text' && !parsed) {
				const analyzed = await analyzeCzmlFile(input, signal);
				if (!isCurrent()) return;
				parsed = analyzed;
				parsedText = { text, file: input, result: parsed };
				const options = typeOptions.filter((option) => dataCount(analyzed, option.key) > 0);
				if (!options.length) throw new Error('表示できる位置・図形・モデルがありません');
				type = options[0].key;
				dataType = type;
				if (options.length > 1) return;
			}
			if (!parsed) return;
			if (mode === 'text' && type === 'models') {
				for (const model of parsed.models) {
					let absolute = false;
					try {
						const url = new URL(model.uri);
						absolute =
							url.protocol === 'data:' || (/^https?:\/\//i.test(model.uri) && !!url.hostname);
					} catch {
						// 相対参照は関連ファイルを含めたファイル入力で解決する。
					}
					if (!absolute)
						throw new Error(
							'テキスト入力の3DモデルにはHTTP(S)の絶対URLまたはdata URIを指定してください。相対参照を使う場合は「ファイル」に切り替え、CZMLとモデル・画像をまとめて選択してください。'
						);
				}
			}
			const entryName = (mode === 'text' ? manualEntryName : name).trim() || 'CZML';
			const entry =
				type === 'models'
					? await createCzmlModelEntry(
							parsed,
							input,
							mode === 'file' ? uploadFiles : [],
							entryName,
							signal
						)
					: await createCzmlEntry(parsed[type], entryName);
			if (!isCurrent()) {
				if (entry?.type === 'model') URL.revokeObjectURL(entry.format.url);
				else if (entry) GeojsonCache.remove(entry.id);
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
	<div class="w-full p-2">
		<HorizontalSelectBox
			label="入力方法を選択"
			bind:group={sourceMode as string | number}
			options={[
				{ key: 'file', name: 'ファイル' },
				{ key: 'text', name: 'テキスト' }
			]}
		/>
	</div>
	{#if sourceMode === 'file'}
		<p>
			3Dモデルを含む場合は、CZMLと参照するglTF・GLB・バイナリ・画像ファイルをまとめて選択してください。
		</p>
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
			{#if uploadFiles.length > 0}<p>
					選択済み: {uploadFiles.length.toLocaleString()}ファイル
				</p>{/if}
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
	{:else}
		<div class="flex w-full flex-col gap-2 p-2">
			<label class="flex flex-col gap-2">
				<span class="text-base font-bold select-none">データ名</span>
				<input
					type="text"
					class="bg-base text-main w-full rounded-lg p-2 focus:outline-0"
					bind:value={manualEntryName}
					disabled={busy}
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-base font-bold select-none">CZMLテキスト</span>
				<textarea
					class="bg-base text-main min-h-[220px] w-full rounded-lg p-3 font-mono text-sm focus:outline-0"
					bind:value={inputText}
					placeholder={'[{"id":"document","version":"1.0"}]'}
				></textarea>
			</label>
		</div>
	{/if}
	{#if result}
		{#if sourceMode === 'file'}
			<label class="flex flex-col gap-2">
				データ名
				<input class="rounded bg-zinc-800 p-2" bind:value={name} disabled={busy} />
			</label>
		{/if}
		<p>
			ポイント: {result.points.features.length.toLocaleString()}件 / 軌跡: {result.tracks.features.length.toLocaleString()}件
			/ ライン: {result.lines.features.length.toLocaleString()}件 / ポリゴン: {result.polygons.features.length.toLocaleString()}件
		</p>
		<p>時刻: {result.timestamps.length.toLocaleString()}件</p>
		{#if result.models.length > 0}<p>3Dモデル: {result.models.length.toLocaleString()}件</p>{/if}
		{#if dataTypesOptions.length > 1}
			<fieldset class="min-w-0" disabled={busy}>
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
	{#if busy}<p role="status">CZMLを処理しています…</p>{/if}
	{#if detectionError || error}<p class="text-red-300" role="alert">
			{detectionError || error}
		</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button class="c-btn-sub cursor-pointer p-4 text-lg" onclick={cancel}>キャンセル</button>
	<button
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
		onclick={register}
		disabled={busy ||
			(sourceMode === 'text' ? !inputText.trim() || (!!result && !canRegister) : !canRegister)}
		>登録</button
	>
</div>
