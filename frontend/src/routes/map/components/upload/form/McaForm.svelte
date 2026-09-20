<script lang="ts">
	import McaRegionGrid from '$routes/map/components/upload/form/McaRegionGrid.svelte';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { mcaFilesToGlbInWorker } from '$routes/map/utils/formats/mca/analyze';
	import { validateMcaFileSet } from '$routes/map/utils/formats/mca/batch';
	import { createMcaModelFile } from '$routes/map/utils/formats/mca/model-file';
	import type { McaRegionPosition } from '$routes/map/utils/formats/mca/types';
	import {
		getSelectedMcaUploadFiles,
		mergeMcaUploadFiles
	} from '$routes/map/utils/formats/mca/upload-grid';
	import { parseMcaRegionFileName } from '$routes/map/utils/formats/mca/world-placement';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}
	let { showDialogType = $bindable(), dropFile = $bindable() }: Props = $props();
	const files = $derived(toUploadFiles(dropFile));
	let excludedFiles = $state.raw<File[]>([]);
	const selectedFiles = $derived(getSelectedMcaUploadFiles(files, excludedFiles));
	const fileSetError = $derived.by(() => {
		if (!selectedFiles.length) return null;
		try {
			validateMcaFileSet(selectedFiles);
			return null;
		} catch (error) {
			return error instanceof Error ? error.message : '地形リージョンを選び直してください。';
		}
	});
	let minChunkX = $state<number | undefined>(0);
	let maxChunkX = $state<number | undefined>(31);
	let minChunkZ = $state<number | undefined>(0);
	let maxChunkZ = $state<number | undefined>(31);
	let activeFiles = $state.raw<File[] | null>(null);
	let running = $state(false);
	const busy = $derived(running && activeFiles === files);
	let errorMessage = $state('');
	let progress = $state('');
	let selectionError = $state('');
	let selectionErrorFiles = $state.raw<File[] | null>(null);
	let gridCenter = $state<McaRegionPosition | undefined>();
	let conversion: AbortController | null = null;

	const cancelConversion = () => {
		conversion?.abort();
		conversion = null;
		running = false;
	};
	const close = () => {
		cancelConversion();
		dropFile = null;
		showDialogType = null;
	};
	const read = async () => {
		if (!selectedFiles.length || fileSetError || busy) return;
		cancelConversion();
		activeFiles = files;
		errorMessage = '';
		if (
			minChunkX === undefined ||
			maxChunkX === undefined ||
			minChunkZ === undefined ||
			maxChunkZ === undefined ||
			![minChunkX, maxChunkX, minChunkZ, maxChunkZ].every(
				(value) => Number.isInteger(value) && value >= 0 && value <= 31
			) ||
			minChunkX > maxChunkX ||
			minChunkZ > maxChunkZ
		) {
			errorMessage = 'チャンク番号は0〜31の整数で、開始が終了以下になるように指定してください。';
			return;
		}
		const sourceFiles = files;
		const input = selectedFiles;
		const controller = new AbortController();
		conversion = controller;
		running = true;
		errorMessage = '';
		progress = '地形データを読み込み中…';
		try {
			const result = await mcaFilesToGlbInWorker(
				input,
				{
					minChunkX,
					maxChunkX,
					minChunkZ,
					maxChunkZ
				},
				controller.signal,
				(update) => {
					if (controller.signal.aborted || sourceFiles !== files) return;
					const fileProgress = update.fileName
						? `${update.fileIndex ?? 1} / ${update.fileCount ?? input.length}ファイル: ${update.fileName} — `
						: '';
					progress = `${fileProgress}${update.stage === 'read' ? 'チャンクを読み込み中' : '3Dモデルを作成中'}（${update.completed.toLocaleString()} / ${update.total.toLocaleString()}）`;
				}
			);
			if (controller.signal.aborted || sourceFiles !== files) return;
			dropFile = [
				createMcaModelFile(
					result.glb,
					input.map((file) => file.name)
				)
			];
			showDialogType = 'model';
			showNotification(
				`${input.length}リージョン、${result.chunkCount.toLocaleString()}チャンクを1つのレイヤーに読み込みました。地図上でワールド原点と1ブロックの長さを設定してください。`,
				'success'
			);
		} catch (error) {
			if (!controller.signal.aborted && sourceFiles === files) {
				errorMessage =
					error instanceof Error ? error.message : 'Minecraftの地形データを読み込めませんでした。';
			}
		} finally {
			if (conversion === controller) {
				conversion = null;
				running = false;
			}
		}
	};
	// 外部ドロップによるファイル差し替えと、ダイアログ破棄時にWorkerを終了する。
	$effect(() => {
		const observedFiles = files;
		return () => {
			if (activeFiles === observedFiles) conversion?.abort();
		};
	});
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">Minecraftの地形を読み込む</div>
<div class="c-scroll flex grow flex-col gap-4 overflow-y-auto p-2 text-sm">
	<p>同じワールドの .mca を追加してください。</p>
	<label class="flex flex-col gap-2">
		<span>地形リージョンを追加（.mca）</span>
		<input
			type="file"
			accept=".mca"
			multiple
			disabled={busy}
			onchange={(event) => {
				const incoming = Array.from(event.currentTarget.files ?? []);
				event.currentTarget.value = '';
				if (!incoming.length) return;
				selectionError = '';
				try {
					const merged = mergeMcaUploadFiles(files, incoming);
					cancelConversion();
					dropFile = merged;
					gridCenter = undefined;
				} catch (error) {
					selectionErrorFiles = files;
					selectionError =
						error instanceof Error ? error.message : 'ファイルを追加できませんでした。';
				}
			}}
		/>
	</label>
	<p>ドロップでも追加できます。同じ区画は上書き。</p>
	{#if selectionError && selectionErrorFiles === files}<p role="alert" class="text-red-300">
			{selectionError}
		</p>{/if}
	<McaRegionGrid {files} bind:center={gridCenter} bind:excludedFiles disabled={busy} />
	{#if files.length}
		<p>{selectedFiles.length} / {files.length}ファイルを読み込み</p>
		<ul class="max-h-40 overflow-y-auto break-all">
			{#each files as file (file)}
				{@const region = parseMcaRegionFileName(file.name)}
				{@const excluded = excludedFiles.includes(file)}
				<li class="flex items-center gap-2 py-1">
					<button
						type="button"
						class={['min-w-0 flex-1 text-left underline', excluded && 'text-gray-400']}
						disabled={!region}
						title="配置図で表示"
						onclick={() => {
							if (region) gridCenter = region;
						}}>{file.name}</button
					>
					{#if excluded}<span class="shrink-0 text-gray-400">対象外</span>{/if}
					<button
						type="button"
						class="c-btn-sub shrink-0 px-2 py-1"
						disabled={busy}
						aria-label={`${file.name}を取り除く`}
						onclick={() => {
							cancelConversion();
							selectionError = '';
							dropFile = files.filter((candidate) => candidate !== file);
							excludedFiles = excludedFiles.filter((candidate) => candidate !== file);
						}}>削除</button
					>
				</li>
			{/each}
		</ul>
	{/if}
	{#if fileSetError}<p role="alert" class="text-red-300">{fileSetError}</p>{/if}
	<fieldset class="flex flex-col gap-3" disabled={busy}>
		<legend class="mb-2 font-bold">読み込むチャンク範囲</legend>
		<p>0〜31・全ファイル共通</p>
		<div class="grid grid-cols-2 gap-3">
			<label class="flex flex-col gap-1"
				><span>X 開始</span><input
					class="c-input w-full"
					type="number"
					min="0"
					max="31"
					step="1"
					bind:value={minChunkX}
				/></label
			>
			<label class="flex flex-col gap-1"
				><span>X 終了</span><input
					class="c-input w-full"
					type="number"
					min="0"
					max="31"
					step="1"
					bind:value={maxChunkX}
				/></label
			>
			<label class="flex flex-col gap-1"
				><span>Z 開始</span><input
					class="c-input w-full"
					type="number"
					min="0"
					max="31"
					step="1"
					bind:value={minChunkZ}
				/></label
			>
			<label class="flex flex-col gap-1"
				><span>Z 終了</span><input
					class="c-input w-full"
					type="number"
					min="0"
					max="31"
					step="1"
					bind:value={maxChunkZ}
				/></label
			>
		</div>
	</fieldset>

	{#if errorMessage && activeFiles === files}<p role="alert" class="text-red-300">
			{errorMessage}
		</p>{/if}
	{#if busy}<p role="status">{progress}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-4">
	<button onclick={close} class="c-btn-sub p-4 text-lg">キャンセル</button>
	<button
		onclick={() => void read()}
		disabled={!selectedFiles.length || !!fileSetError || busy}
		class="c-btn-confirm min-w-[160px] p-4 text-lg">{busy ? '読み込み中…' : '読み込む'}</button
	>
</div>
