<script lang="ts">
	import { onDestroy } from 'svelte';

	import LocalMvtForm from './LocalMvtForm.svelte';
	import LocalRasterTilesForm from './LocalRasterTilesForm.svelte';
	import LocalTiles3DForm from './LocalTiles3DForm.svelte';
	import RasterForm from './RasterForm.svelte';
	import Tiles3DForm from './Tiles3DForm.svelte';
	import VectorForm from './VectorForm.svelte';
	import { resolveDroppedFiles } from '../upload-drop';
	import { checkLargeDroppedFiles } from '../upload-drop-actions';

	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFiles } from '$routes/map/types';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFiles;
		remoteRasterUrl: string | null;
		remoteVectorUrl: string | null;
		remoteTiles3dUrl: string | null;
	}
	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		remoteRasterUrl = $bindable(),
		remoteVectorUrl = $bindable(),
		remoteTiles3dUrl = $bindable()
	}: Props = $props();

	const id = $props.id();
	const kind = $derived(
		showDialogType === '3dtiles' || showDialogType === 'local-3dtiles'
			? '3dtiles'
			: showDialogType === 'raster' || showDialogType === 'local-raster-tiles'
				? 'raster'
				: 'vector'
	);
	const title = $derived(
		kind === '3dtiles' ? '3D Tiles' : kind === 'raster' ? 'ラスタータイル' : 'ベクタータイル'
	);
	const files = $derived(toUploadFiles(dropFile));
	let inputMode = $derived<'url' | 'file'>(
		showDialogType?.startsWith('local-') && files.length > 0 ? 'file' : 'url'
	);
	const tabs = [
		{ key: 'url', label: 'URL' },
		{ key: 'file', label: 'ローカルファイル' }
	] as const;
	let selecting = $state(false);
	let registering = $state(false);
	let error = $state('');
	let folderInput: HTMLInputElement;
	let zipInput: HTMLInputElement;
	let active = true;
	onDestroy(() => {
		active = false;
	});

	const setDialogType = (value: DialogType) => {
		if (value === null) {
			active = false;
			dropFile = null;
			remoteRasterUrl = null;
			remoteVectorUrl = null;
			remoteTiles3dUrl = null;
		}
		showDialogType = value;
	};

	const selectFiles = async (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const incoming = Array.from(input.files ?? []);
		input.value = '';
		if (!incoming.length || selecting || registering) return;
		const requestedKind = kind;
		const previousFiles = dropFile;
		selecting = true;
		error = '';
		try {
			if (!(await checkLargeDroppedFiles(incoming)) || !active) return;
			const decision = await resolveDroppedFiles(incoming);
			if (!active || kind !== requestedKind || dropFile !== previousFiles) return;
			if (decision.type === 'notification') throw new Error(decision.message);
			const expected =
				requestedKind === '3dtiles'
					? ['local-3dtiles']
					: requestedKind === 'raster'
						? ['local-raster-tiles']
						: ['local-mvt', 'local-mlt'];
			if (decision.type !== 'dialog' || !expected.includes(decision.dialogType ?? '')) {
				throw new Error(`${title}のフォルダ、または階層を保ったZIPを選択してください。`);
			}
			dropFile = decision.dropFiles ?? incoming;
			showDialogType = decision.dialogType;
			inputMode = 'file';
		} catch (cause) {
			if (active) error = cause instanceof Error ? cause.message : String(cause);
		} finally {
			if (active) selecting = false;
		}
	};

	const handleTabKey = (event: KeyboardEvent) => {
		if (registering || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
		event.preventDefault();
		inputMode =
			event.key === 'Home'
				? 'url'
				: event.key === 'End'
					? 'file'
					: inputMode === 'url'
						? 'file'
						: 'url';
		document.getElementById(`${id}-${inputMode}-tab`)?.focus();
	};
</script>

<div class="flex max-h-[calc(100dvh-4rem)] min-h-0 flex-col">
	<h2 class="shrink-0 pb-4 text-2xl font-bold">{title}の登録</h2>
	<div
		role="tablist"
		aria-label="入力方法"
		class="mb-4 flex shrink-0 gap-1 border-b border-gray-600"
	>
		{#each tabs as tab (tab.key)}
			<button
				type="button"
				role="tab"
				disabled={registering}
				id={`${id}-${tab.key}-tab`}
				aria-controls={`${id}-${tab.key}-panel`}
				aria-selected={inputMode === tab.key}
				tabindex={inputMode === tab.key ? 0 : -1}
				onclick={() => (inputMode = tab.key)}
				onkeydown={handleTabKey}
				class="cursor-pointer border-b-2 px-5 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 {inputMode ===
				tab.key
					? 'border-white text-white'
					: 'border-transparent text-gray-400 hover:text-white'}">{tab.label}</button
			>
		{/each}
	</div>

	<div
		role="tabpanel"
		id={`${id}-url-panel`}
		aria-labelledby={`${id}-url-tab`}
		class={inputMode === 'url' ? 'flex min-h-0 flex-col' : 'hidden'}
	>
		{#if kind === 'raster'}
			<RasterForm
				bind:showDataEntry
				bind:showDialogType={() => showDialogType, setDialogType}
				bind:remoteRasterUrl
			/>
		{:else if kind === '3dtiles'}
			<Tiles3DForm
				bind:showDataEntry
				bind:showDialogType={() => showDialogType, setDialogType}
				bind:remoteTiles3dUrl
				bind:registering
				active={inputMode === 'url'}
			/>
		{:else}
			<VectorForm
				bind:showDataEntry
				bind:showDialogType={() => showDialogType, setDialogType}
				bind:remoteVectorUrl
			/>
		{/if}
	</div>

	<div
		role="tabpanel"
		id={`${id}-file-panel`}
		aria-labelledby={`${id}-file-tab`}
		class={inputMode === 'file' ? 'flex min-h-0 flex-col' : 'hidden'}
	>
		<div class="mb-4 flex shrink-0 flex-col gap-3 rounded border border-dashed border-gray-500 p-4">
			<p class="text-sm">タイルのフォルダ、またはZIPをここにドロップしてください。</p>
			<div class="flex flex-wrap gap-3">
				<button
					type="button"
					class="c-btn-sub px-4 py-2 disabled:opacity-50"
					disabled={selecting || registering}
					onclick={() => folderInput.click()}>フォルダを選択</button
				>
				<button
					type="button"
					class="c-btn-sub px-4 py-2 disabled:opacity-50"
					disabled={selecting || registering}
					onclick={() => zipInput.click()}>ZIPを選択</button
				>
			</div>
			<input
				bind:this={folderInput}
				type="file"
				webkitdirectory
				multiple
				class="hidden"
				aria-label="タイルフォルダ"
				onchange={selectFiles}
			/>
			<input
				bind:this={zipInput}
				type="file"
				accept=".zip"
				class="hidden"
				aria-label="タイルZIP"
				onchange={selectFiles}
			/>
			<p class="text-xs text-gray-400">
				{#if kind === '3dtiles'}
					tileset.jsonと、参照するモデル・テクスチャを含むフォルダ全体を選択してください。
				{:else}
					{kind === 'raster' ? 'PNG・JPEG・WebP' : 'MVT・PBF・MLT（gzip圧縮も可）'}。
					{'{z}/{x}/{y}'}のフォルダ階層を保って選択してください。
				{/if}
			</p>
		</div>
		{#if selecting}<p role="status" class="pb-3 text-sm">ファイルを確認しています…</p>{/if}
		{#if error}<p role="alert" class="pb-3 text-sm text-red-300">{error}</p>{/if}
		{#if files.length && showDialogType?.startsWith('local-')}
			{#if kind === 'raster'}
				<LocalRasterTilesForm
					bind:showDataEntry
					bind:showDialogType={() => showDialogType, setDialogType}
					bind:dropFile
				/>
			{:else if kind === '3dtiles'}
				<LocalTiles3DForm
					bind:showDataEntry
					bind:showDialogType={() => showDialogType, setDialogType}
					bind:dropFile
					bind:registering
					active={inputMode === 'file'}
				/>
			{:else}
				<LocalMvtForm
					bind:showDataEntry
					bind:showDialogType={() => showDialogType, setDialogType}
					bind:dropFile
				/>
			{/if}
		{:else}
			<div class="flex justify-center pt-2">
				<button type="button" class="c-btn-sub p-4 text-lg" onclick={() => setDialogType(null)}
					>キャンセル</button
				>
			</div>
		{/if}
	</div>
</div>
