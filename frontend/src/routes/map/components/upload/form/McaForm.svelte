<script lang="ts">
	import McaRegionGrid from '$routes/map/components/upload/form/McaRegionGrid.svelte';
	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { mcaFilesToGlbInWorker } from '$routes/map/utils/formats/mca/analyze';
	import { validateMcaFileSet } from '$routes/map/utils/formats/mca/batch';
	import { createMcaModelFile } from '$routes/map/utils/formats/mca/model-file';
	import {
		getInitialMcaExclusions,
		getSelectedMcaUploadFiles,
		mergeMcaUploadFiles
	} from '$routes/map/utils/formats/mca/upload-grid';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}
	let { showDialogType = $bindable(), dropFile = $bindable() }: Props = $props();
	const files = $derived(toUploadFiles(dropFile));
	let excludedFiles = $state.raw<File[]>([]);
	let initialSelectionApplied = false;
	$effect.pre(() => {
		if (initialSelectionApplied || !files.length) return;
		excludedFiles = getInitialMcaExclusions(files);
		initialSelectionApplied = true;
	});
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
	let activeFiles = $state.raw<File[] | null>(null);
	let running = $state(false);
	const busy = $derived(running && activeFiles === files);
	let errorMessage = $state('');
	let progress = $state('');
	let selectionError = $state('');
	let selectionErrorFiles = $state.raw<File[] | null>(null);
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
		const sourceFiles = files;
		const input = selectedFiles;
		const controller = new AbortController();
		conversion = controller;
		const releaseProcessing = beginUploadProcessing(controller.signal);
		running = true;
		errorMessage = '';
		progress = '地形データを読み込み中…';
		try {
			const result = await mcaFilesToGlbInWorker(input, {}, controller.signal, (update) => {
				if (controller.signal.aborted || sourceFiles !== files) return;
				const fileProgress = update.fileName
					? `${update.fileIndex ?? 1} / ${update.fileCount ?? input.length}ファイル: ${update.fileName} — `
					: '';
				progress = `${fileProgress}${update.stage === 'read' ? 'チャンクを読み込み中' : '3Dモデルを作成中'}（${update.completed.toLocaleString()} / ${update.total.toLocaleString()}）`;
			});
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
			releaseProcessing();
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
	<div class="flex flex-wrap items-center gap-3">
		<label
			class={[
				'c-btn-sub relative px-3 py-2 focus-within:outline-2',
				busy ? 'opacity-50' : 'cursor-pointer'
			]}
		>
			<span>地形リージョンを追加（.mca）</span>
			<input
				type="file"
				class="sr-only"
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
					} catch (error) {
						selectionErrorFiles = files;
						selectionError =
							error instanceof Error ? error.message : 'ファイルを追加できませんでした。';
					}
				}}
			/>
		</label>
		<p aria-live="polite">追加済み {files.length}件（読み込み対象 {selectedFiles.length}件）</p>
	</div>
	<p>ドロップでも追加できます。同じ区画は上書き。</p>
	{#if selectionError && selectionErrorFiles === files}<p role="alert" class="text-red-300">
			{selectionError}
		</p>{/if}
	<McaRegionGrid {files} bind:excludedFiles disabled={busy} />
	{#if fileSetError}<p role="alert" class="text-red-300">{fileSetError}</p>{/if}
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
