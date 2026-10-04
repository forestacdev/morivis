<script lang="ts">
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import { inspectOrbitFile, propagateOrbitFile } from '$routes/map/utils/formats/orbit/analyze';
	import { formatOrbit, orbitLimits } from '$routes/map/utils/formats/orbit/definition';
	import { createOrbitEntry } from '$routes/map/utils/formats/orbit/entry';
	import { isOrbitFile } from '$routes/map/utils/formats/orbit/files';
	import type { OrbitOptions, OrbitSummary } from '$routes/map/utils/formats/orbit/types';
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
	let name = $state('');
	let dataType = $state<'points' | 'tracks'>('tracks');
	let start = $state('');
	let end = $state('');
	let stepSeconds = $state<number | undefined>(60);
	let fileInput = $state<HTMLInputElement | null>(null);
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
	let selection = $state.raw<{ batch: UploadFilesInput; index: number } | null>(null);
	const selectedIndex = $derived(selection && selection.batch === dropFile ? selection.index : 0);
	const file = $derived(files[selectedIndex] ?? files[0] ?? null);
	let inspected = $state.raw<{
		file: File;
		text: string | null;
		batch: UploadFilesInput;
		summary: OrbitSummary;
	} | null>(null);
	const summary = $derived.by(() => {
		if (!inspected) return null;
		if (sourceMode === 'text') return inspected.text === inputText ? inspected.summary : null;
		return inspected.batch === dropFile && inspected.file === file && inspected.text === null
			? inspected.summary
			: null;
	});
	const epochRange = $derived.by(() => {
		const epochs = summary?.satellites.map((satellite) => satellite.epoch).sort() ?? [];
		return epochs.length ? [epochs[0], epochs[epochs.length - 1]] : null;
	});
	const options = $derived.by((): OrbitOptions | null => {
		if (
			!start ||
			!end ||
			stepSeconds === undefined ||
			!Number.isInteger(stepSeconds) ||
			stepSeconds < orbitLimits.minStepSeconds ||
			stepSeconds > orbitLimits.maxStepSeconds
		)
			return null;
		const startTime = Date.parse(`${start}Z`);
		const endTime = Date.parse(`${end}Z`);
		if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime)
			return null;
		return {
			start: new Date(startTime).toISOString(),
			end: new Date(endTime).toISOString(),
			stepSeconds
		};
	});
	const sampleCount = $derived(
		options && summary
			? (Math.ceil(
					(Date.parse(options.end) - Date.parse(options.start)) / (options.stepSeconds * 1000)
				) +
					1) *
					summary.satellites.length
			: 0
	);
	const optionsError = $derived(
		!summary
			? ''
			: !options
				? `終了時刻は開始時刻より後にし、計算間隔には${orbitLimits.minStepSeconds}〜${orbitLimits.maxStepSeconds.toLocaleString()}秒の整数を指定してください。`
				: Date.parse(options.end) - Date.parse(options.start) >
					  orbitLimits.maxDurationSeconds * 1000
					? `計算期間は${orbitLimits.maxDurationSeconds / 86400}日以内にしてください。`
					: sampleCount > formatOrbit.limits.maxSamples
						? `計算点数が上限の${formatOrbit.limits.maxSamples.toLocaleString()}点を超えています。期間を短くするか、計算間隔を広げてください。`
						: ''
	);
	const distantEpochCount = $derived(
		options && summary
			? summary.satellites.filter((satellite) => {
					const epoch = Date.parse(satellite.epoch);
					return (
						Math.max(
							Math.abs(Date.parse(options.start) - epoch),
							Math.abs(Date.parse(options.end) - epoch)
						) >
						14 * 86400 * 1000
					);
				}).length
			: 0
	);
	let loading = $state(false);
	let discovering = $state(false);
	const busy = $derived(loading || discovering);
	let error = $state('');
	let notice = $state('');
	let controller: AbortController | undefined;
	let observedBatch: UploadFilesInput = null;

	const applyDefaults = (value: OrbitSummary) => {
		start = value.defaultOptions.start.replace(/Z$/, '');
		end = value.defaultOptions.end.replace(/Z$/, '');
		stepSeconds = value.defaultOptions.stepSeconds;
	};

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
						const matches = await Promise.all(inputs.map((input) => isOrbitFile(input)));
						if (task.signal.aborted || dropFile !== batch) return;
						const candidates = inputs.filter((_, index) => matches[index]);
						detectedInput = {
							batch,
							files: candidates,
							error: candidates.length ? '' : 'TLE / OMMファイルが見つかりません。'
						};
					} catch (cause) {
						if (!task.signal.aborted && dropFile === batch)
							detectedInput = {
								batch,
								files: [],
								error: cause instanceof Error ? cause.message : 'ファイルを確認できませんでした'
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
		const mode = sourceMode;
		const input = file;
		const batch = dropFile;
		void inputText;
		const task = new AbortController();
		controller = task;
		inspected = null;
		dataType = 'tracks';
		start = '';
		end = '';
		stepSeconds = 60;
		error = '';
		notice = '';
		loading = mode === 'file' && !!input;
		if (mode === 'file') name = input?.name.replace(/\.[^.]+$/, '') ?? '';
		if (mode === 'file' && input) {
			untrack(() => {
				const release = beginUploadProcessing(task.signal);
				const isCurrent = () =>
					!task.signal.aborted && sourceMode === mode && file === input && dropFile === batch;
				void (async () => {
					try {
						const value = await inspectOrbitFile(input, task.signal);
						if (!isCurrent()) return;
						inspected = { file: input, text: null, batch, summary: value };
						applyDefaults(value);
					} catch (cause) {
						if (isCurrent())
							error = cause instanceof Error ? cause.message : '軌道要素を読み込めませんでした';
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
		if (!controller || controller.signal.aborted || busy) return;
		const mode = sourceMode;
		const text = inputText;
		const input =
			mode === 'text'
				? inspected?.text === text
					? inspected.file
					: new File([text], 'input.tle', { type: 'text/plain' })
				: file;
		if (!input || (mode === 'text' && !text.trim())) return;
		if (summary && (optionsError || !options)) return;
		const batch = dropFile;
		const signal = controller.signal;
		const type = dataType;
		const calculationOptions = options;
		const entryName = (mode === 'text' ? manualEntryName : name).trim() || 'TLE / OMM';
		const isCurrent = () =>
			!signal.aborted &&
			sourceMode === mode &&
			dropFile === batch &&
			(mode === 'text' ? inputText === text : file === input);
		const release = beginUploadProcessing(signal);
		loading = true;
		error = '';
		notice = '';
		try {
			if (!summary) {
				const value = await inspectOrbitFile(input, signal);
				if (!isCurrent()) return;
				inspected = { file: input, text: mode === 'text' ? text : null, batch, summary: value };
				applyDefaults(value);
				notice = '衛星情報を読み込みました。計算期間を確認して登録してください。';
				return;
			}
			if (!calculationOptions) return;
			const result = await propagateOrbitFile(input, calculationOptions, signal);
			if (!isCurrent()) return;
			if (!result[type].features.length)
				throw new Error(result.warnings.join('\n') || '指定した期間に表示できる軌道がありません。');
			const entry = await createOrbitEntry(result[type], entryName);
			if (!isCurrent()) {
				if (entry) GeojsonCache.remove(entry.id);
				return;
			}
			if (!entry) throw new Error('軌道のエントリーを作成できませんでした');
			showDataEntry = entry;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			if (isCurrent())
				error = cause instanceof Error ? cause.message : '軌道を登録できませんでした';
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

<div class="shrink-0 pb-4 text-2xl font-bold">TLE / OMM</div>
<div class="c-scroll flex min-h-0 grow flex-col gap-4 overflow-y-auto text-sm">
	<p>衛星の軌道要素から、指定した期間の地上位置を計算します。</p>
	<p>TLEとJSON形式のOMMに対応しています。</p>
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
		<div class="flex flex-col items-start gap-2">
			<span>TLE / OMMファイル</span>
			<button
				type="button"
				class="c-btn-confirm min-w-[180px] p-3 text-base"
				onclick={() => fileInput?.click()}
			>
				{uploadFiles.length ? 'ファイルを選び直す' : 'ファイルを選択'}
			</button>
			<input
				bind:this={fileInput}
				type="file"
				aria-label="TLE / OMMファイル"
				accept={formatOrbit.extensions.join(',')}
				class="hidden"
				multiple
				onchange={(event) => {
					const selected = Array.from(event.currentTarget.files ?? []);
					event.currentTarget.value = '';
					if (selected.length) {
						controller?.abort();
						dropFile = selected;
					}
				}}
			/>
			{#if uploadFiles.length}<p>選択済み: {uploadFiles.length.toLocaleString()}ファイル</p>{/if}
		</div>
		{#if files.length > 1}
			<label class="flex flex-col gap-2">
				読み込むファイル
				<select class="rounded bg-zinc-800 p-2" bind:value={() => selectedIndex, selectFile}>
					{#each files as item, index (item)}<option value={index}>{item.name}</option>{/each}
				</select>
			</label>
		{:else if file}<p class="break-all">{file.name}</p>
		{:else}<p>TLE / OMMファイルを選択してください。</p>{/if}
		{#if summary}
			<label class="flex flex-col gap-2"
				>データ名<input class="rounded bg-zinc-800 p-2" bind:value={name} disabled={busy} /></label
			>
		{/if}
	{:else}
		<div class="flex w-full flex-col gap-2 p-2">
			<label class="flex flex-col gap-2"
				><span class="text-base font-bold select-none">データ名</span><input
					type="text"
					class="bg-base text-main w-full rounded-lg p-2 focus:outline-0"
					bind:value={manualEntryName}
					disabled={busy}
				/></label
			>
			<label class="flex flex-col gap-2"
				><span class="text-base font-bold select-none">TLE / OMMテキスト</span><textarea
					class="bg-base text-main min-h-[220px] w-full rounded-lg p-3 font-mono text-sm focus:outline-0"
					bind:value={inputText}
					placeholder="TLE または OMM JSONを貼り付けてください"
				></textarea></label
			>
		</div>
	{/if}
	{#if summary}
		<p>衛星: {summary.satellites.length.toLocaleString()}基</p>
		{#if epochRange}
			<p class="break-all">
				軌道要素の基準時刻（UTC）: {epochRange[0]}{#if epochRange[0] !== epochRange[1]}
					〜 {epochRange[1]}{/if}
			</p>
		{/if}
		<fieldset class="flex min-w-0 flex-col gap-4" disabled={busy}>
			<HorizontalSelectBox
				label="データタイプを選択"
				bind:group={dataType as string | number}
				options={[
					{ key: 'points', name: 'ポイント' },
					{ key: 'tracks', name: '地上軌跡' }
				]}
			/>
			<label class="flex flex-col gap-2"
				>開始時刻（UTC）<input
					type="datetime-local"
					step="0.001"
					class="rounded bg-zinc-800 p-2"
					bind:value={start}
				/></label
			>
			<label class="flex flex-col gap-2"
				>終了時刻（UTC）<input
					type="datetime-local"
					step="0.001"
					class="rounded bg-zinc-800 p-2"
					bind:value={end}
				/></label
			>
			<label class="flex flex-col gap-2"
				>計算間隔（秒）<input
					type="number"
					min={orbitLimits.minStepSeconds}
					max={orbitLimits.maxStepSeconds}
					step="1"
					class="rounded bg-zinc-800 p-2"
					bind:value={stepSeconds}
				/></label
			>
		</fieldset>
		{#if options}<p>
				計算点数: {sampleCount.toLocaleString()}点 / 上限: {formatOrbit.limits.maxSamples.toLocaleString()}点
			</p>{/if}
		{#if optionsError}<p class="text-red-300" role="alert">{optionsError}</p>{/if}
		{#if distantEpochCount > 0}
			<p class="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-amber-200">
				{distantEpochCount.toLocaleString()}基で、計算期間が軌道要素の基準時刻から14日以上離れています。予測誤差が大きくなる場合があります。
			</p>
		{/if}
		<p>高度は属性として保持し、地上位置を表示します。</p>
	{/if}
	{#if notice}<p role="status">{notice}</p>{/if}
	{#if busy}<p role="status">軌道要素を処理しています…</p>{/if}
	{#if detectionError || error}<p class="text-red-300" role="alert">
			{detectionError || error}
		</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button class="c-btn-sub cursor-pointer p-4 text-lg" onclick={cancel}>キャンセル</button>
	<button
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
		onclick={register}
		disabled={busy || !!optionsError || (sourceMode === 'text' ? !inputText.trim() : !summary)}
		>登録</button
	>
</div>
