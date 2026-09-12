<script lang="ts">
	import { onDestroy } from 'svelte';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createTiles3DEntry } from '$routes/map/data/entries/model';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { findLocalTilesetFiles, getLocalFilePath } from '$routes/map/utils/formats/tiles3d';
	import { getTileset3DBbox } from '$routes/map/utils/tiles3d/bounds';
	import {
		registerLocalTileset,
		retainLocalTilesetEntry
	} from '$routes/map/utils/tiles3d/local-files';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

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
	const files = $derived(toUploadFiles(dropFile));
	let candidates = $state.raw<File[]>([]);
	let selectedPath = $state('');
	const rootFile = $derived(
		candidates.find((file) => getLocalFilePath(file) === selectedPath) ?? candidates[0]
	);
	let name = $derived(
		rootFile
			? getLocalFilePath(rootFile).split('/').slice(-2, -1)[0] ||
					rootFile.name.replace(/\.json$/i, '')
			: '3D Tiles'
	);
	const totalBytes = $derived(files.reduce((sum, file) => sum + file.size, 0));
	let loading = $state(true);
	let registering = $state(false);
	let error = $state('');
	let disposed = false;
	onDestroy(() => {
		disposed = true;
	});

	$effect(() => {
		const input = files;
		let active = true;
		loading = true;
		candidates = [];
		findLocalTilesetFiles(input)
			.then((result) => {
				if (!active) return;
				candidates = result;
				error = result.length ? '' : '3D Tilesのタイルセットが見つかりません';
			})
			.catch((cause) => {
				if (active) error = String(cause);
			})
			.finally(() => {
				if (active) loading = false;
			});
		return () => {
			active = false;
		};
	});

	const register = async () => {
		if (!rootFile || registering || !name.trim()) return;
		const input = files;
		const selectedRoot = rootFile;
		const entryName = name.trim();
		registering = true;
		isProcessing.set(true);
		error = '';
		let source: Awaited<ReturnType<typeof registerLocalTileset>> | undefined;
		try {
			source = await registerLocalTileset(input, selectedRoot);
			if (disposed || files !== input) {
				source.dispose();
				return;
			}
			const { bbox, styleType, error: boundsError } = getTileset3DBbox(source.tileset);
			if (!bbox) throw new Error(boundsError ?? '表示範囲を取得できませんでした');
			const entry = createTiles3DEntry(entryName, source.url, bbox, styleType);
			retainLocalTilesetEntry(entry.id, source.url);
			showDataEntry = entry;
			dropFile = null;
			showDialogType = null;
			showNotification('3D Tilesを読み込みました', 'success');
		} catch (cause) {
			source?.dispose();
			if (!disposed) error = cause instanceof Error ? cause.message : String(cause);
		} finally {
			registering = false;
			isProcessing.set(false);
		}
	};
	const cancel = () => {
		disposed = true;
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="pb-4 text-2xl font-bold">3D Tilesフォルダの登録</div>
<div class="c-scroll flex w-full grow flex-col gap-4 overflow-y-auto">
	<TextForm bind:value={name} label="データ名" />
	{#if candidates.length > 1}
		<label class="flex flex-col gap-2 text-sm">
			<span>読み込むタイルセット</span>
			<select
				class="rounded border border-white/20 bg-[#252525] px-3 py-2"
				bind:value={selectedPath}
				disabled={registering}
			>
				{#each candidates as file (getLocalFilePath(file))}
					<option value={getLocalFilePath(file)}>{getLocalFilePath(file)}</option>
				{/each}
			</select>
		</label>
	{:else if rootFile}
		<p class="break-all text-sm text-gray-300">{getLocalFilePath(rootFile)}</p>
	{/if}
	<p class="text-sm text-gray-300">
		{files.length.toLocaleString()}ファイル・{(totalBytes / 1024 ** 3).toFixed(2)} GB
	</p>
	<p class="text-sm text-gray-400">
		地図の表示範囲に応じて、必要なタイルをフォルダから読み込みます。
	</p>
	<p class="text-xs text-gray-400">
		ページを再読み込みした場合は、フォルダをもう一度ドロップしてください。
	</p>
	{#if loading}<p role="status">タイルセットを確認しています…</p>{/if}
	{#if error}<p class="text-sm text-red-300" role="alert">{error}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-4">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={register}
		disabled={loading || registering || !rootFile || !name.trim()}
		class="c-btn-confirm min-w-[200px] p-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
	>
		{registering ? '参照ファイルを確認中…' : '登録'}
	</button>
</div>
