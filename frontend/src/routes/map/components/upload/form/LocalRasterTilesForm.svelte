<script lang="ts">
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createRasterEntry } from '$routes/map/data/entries/raster';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import {
		registerLocalRasterTiles,
		retainLocalRasterTileEntry
	} from '$routes/map/protocol/raster/local-tiles';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import {
		inspectLocalRasterTiles,
		type LocalRasterTileSource
	} from '$routes/map/utils/formats/raster-tiles';
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
	const files = $derived(toUploadFiles(dropFile));
	let source = $state.raw<LocalRasterTileSource | null>(null);
	let name = $state('');
	let scheme = $state<'auto' | 'xyz' | 'tms'>('auto');
	let loading = $state(true);
	let error = $state('');
	let previousFiles: File[] | undefined;
	$effect(() => {
		const input = files;
		const resetName = previousFiles !== input;
		previousFiles = input;
		let active = true;
		loading = true;
		source = null;
		error = '';
		inspectLocalRasterTiles(input, scheme === 'auto' ? undefined : scheme)
			.then((result) => {
				if (!active) return;
				source = result;
				if (resetName || !name.trim()) name = result.name;
			})
			.catch((cause) => {
				if (active) error = cause instanceof Error ? cause.message : String(cause);
			})
			.finally(() => {
				if (active) loading = false;
			});
		return () => {
			active = false;
		};
	});
	const register = () => {
		if (!source || !name.trim()) return;
		const runtime = registerLocalRasterTiles(source);
		try {
			const entry = createRasterEntry(name.trim(), runtime.url, {
				bounds: source.bounds,
				minZoom: source.minZoom,
				maxZoom: source.maxZoom,
				tileSize: source.tileSize
			});
			retainLocalRasterTileEntry(entry.id, runtime.url);
			showDataEntry = entry;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			runtime.dispose();
			error = cause instanceof Error ? cause.message : String(cause);
		}
	};
	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="pb-4 text-2xl font-bold">ラスタータイルの登録</div>
<div class="c-scroll flex w-full grow flex-col gap-4 overflow-y-auto">
	<TextForm bind:value={name} label="データ名" />
	<label class="flex flex-col gap-2 text-sm">
		<span>タイルの座標方式</span>
		<select bind:value={scheme} class="bg-sub rounded border border-gray-600 p-2 text-white">
			<option value="auto">TileJSONに従う（未指定ならXYZ）</option>
			<option value="xyz">XYZ（北から南へ番号が増える）</option>
			<option value="tms">TMS（南から北へ番号が増える）</option>
		</select>
	</label>
	{#if loading}<p role="status">タイルの構成を確認しています…</p>{/if}
	{#if source}
		<p class="text-sm text-gray-300">
			{source.tiles.size.toLocaleString()}タイル・ズーム {source.minZoom}〜{source.maxZoom}・{source.tileSize}px
		</p>
		<p class="text-sm text-gray-400">表示範囲に応じて必要な画像だけを読み込みます。</p>
		<p class="text-xs text-gray-400">
			ページを再読み込みした場合は、フォルダをもう一度ドロップしてください。
		</p>
	{/if}
	{#if error}<p role="alert" class="text-sm text-red-300">{error}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-4">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={register}
		disabled={loading || !source || !name.trim()}
		class="c-btn-confirm min-w-[200px] p-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
		>登録</button
	>
</div>
