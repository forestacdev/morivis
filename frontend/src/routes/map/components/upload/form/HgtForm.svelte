<script lang="ts">
	import { untrack } from 'svelte';

	import { checkLargeDroppedFiles } from '../upload-resource-check';
	import type { TransformOptionMode } from './pending-zone-vector';
	import type { GeoRefData, RasterRegistrationMode } from './transform/georef-types';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { isHgtFile, type HgtGrid } from '$routes/map/utils/formats/hgt';
	import { runHgtWorker } from '$routes/map/utils/formats/hgt/analyze';
	import { formatHgt } from '$routes/map/utils/formats/hgt/definition';
	import { createHgtEntry } from '$routes/map/utils/formats/hgt/entry';
	import { createRasterGeoRefData } from '$routes/map/utils/formats/raster/georef';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		geoRefData: GeoRefData | null;
	}
	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();
	const files = $derived(toUploadFiles(dropFile).filter(isHgtFile));
	let selectedIndex = $state(-1);
	const file = $derived(files.length === 1 ? files[0] : files[selectedIndex]);
	let grid = $state.raw<HgtGrid | null>(null);
	let name = $state('');
	let error = $state('');
	let loading = $state(false);
	let registrationMode = $state<RasterRegistrationMode>('raster');
	let controller: AbortController | undefined;

	$effect(() => {
		const input = file;
		const task = new AbortController();
		controller = task;
		grid = null;
		error = '';
		registrationMode = 'raster';
		name = input?.name.replace(/\.hgt$/i, '') ?? '';
		loading = !!input;
		if (input)
			untrack(() => {
				const release = beginUploadProcessing(task.signal);
				void runHgtWorker(input, task.signal)
					.then((parsed) => {
						if (task.signal.aborted) return;
						grid = parsed;
					})
					.catch((cause) => {
						if (!task.signal.aborted)
							error = cause instanceof Error ? cause.message : 'SRTM HGTを読み込めませんでした';
					})
					.finally(() => {
						release();
						if (!task.signal.aborted) loading = false;
					});
			});
		return () => task.abort();
	});

	const register = async () => {
		if (!grid?.sampleBounds || !controller || loading) return;
		const signal = controller.signal;
		const release = beginUploadProcessing(signal);
		loading = true;
		error = '';
		try {
			const entry = await createHgtEntry(grid, name.trim() || 'SRTM HGT', registrationMode, signal);
			if (signal.aborted) return;
			showDataEntry = entry;
			transformOptionMode = null;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			if (!signal.aborted)
				error = cause instanceof Error ? cause.message : 'SRTM HGTを登録できませんでした';
		} finally {
			release();
			if (!signal.aborted) loading = false;
		}
	};
	const placeManually = () => {
		if (!grid || !file || loading) return;
		geoRefData = {
			...createRasterGeoRefData({
				entryId: `hgt_${crypto.randomUUID()}`,
				entryName: name.trim() || 'SRTM HGT',
				parsedBands: grid.bands,
				parsedNodata: NaN,
				dataRanges: grid.ranges,
				imageWidth: grid.width,
				imageHeight: grid.height,
				imageFile: file,
				registrationMode,
				allowedTransformModes: ['georef'],
				meshConfig: { attribution: 'SRTM HGT' }
			}),
			rasterConfig: { attribution: 'SRTM HGT', singleColorMap: 'jet' }
		};
		transformOptionMode = 'georef';
		showDialogType = null;
	};
	const confirmRegistration = async () => {
		if (!grid || loading) return;
		if (grid.sampleBounds) await register();
		else placeManually();
	};
	const cancel = () => {
		controller?.abort();
		transformOptionMode = null;
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">SRTM HGT</div>
<div class="flex flex-col gap-4 text-sm">
	<p>1度タイルの1201×1201、1801×3601、3601×3601に対応しています。</p>
	<label class="flex flex-col gap-2"
		>HGTファイルを選択
		<input
			type="file"
			accept={formatHgt.extensions.join(',')}
			multiple
			disabled={loading}
			onchange={async (event) => {
				const selected = Array.from(event.currentTarget.files ?? []);
				const task = controller;
				if (
					selected.length &&
					(await checkLargeDroppedFiles(selected)) &&
					controller === task &&
					!task?.signal.aborted
				) {
					selectedIndex = -1;
					dropFile = selected;
				}
			}}
		/>
	</label>
	{#if files.length > 1}
		<label class="flex flex-col gap-2"
			>今回読み込むファイルを1つ選択
			<select class="rounded bg-zinc-800 p-2" bind:value={selectedIndex} disabled={loading}>
				<option value={-1} disabled>ファイルを選択してください</option>
				{#each files as item, index (item)}<option value={index}>{item.name}</option>{/each}
			</select>
		</label>
	{:else}<p>{file?.name ?? 'ファイルがありません。'}</p>{/if}
	{#if grid}
		<label class="flex flex-col gap-2"
			>データ名<input class="rounded bg-zinc-800 p-2" bind:value={name} disabled={loading} /></label
		>
		<p>
			{grid.width} 列 × {grid.height} 行 ／ 標高: {grid.ranges[0].min} ～ {grid.ranges[0].max} m
		</p>
		{#if grid.sampleBounds}
			<p>
				WGS84 ／ 経度 {grid.sampleBounds[0]} ～ {grid.sampleBounds[2]}°、緯度 {grid.sampleBounds[1]} ～
				{grid.sampleBounds[3]}°
			</p>
		{:else}
			<p>ファイル名から位置を取得できません。決定時に位置合わせへ進みます。</p>
		{/if}
		<fieldset class="w-full px-2" disabled={loading}>
			<HorizontalSelectBox
				label="登録方法"
				options={[
					{ key: 'raster', name: 'ラスター' },
					{ key: 'mesh', name: '3Dメッシュ' }
				]}
				bind:group={registrationMode}
			/>
			<p class="mt-2 text-xs text-gray-400">
				3Dメッシュは標高をメートル単位の高さとして表示します。
			</p>
		</fieldset>
		{#if error && grid.sampleBounds}
			<button class="c-btn-confirm rounded-lg px-4 py-2" disabled={loading} onclick={placeManually}
				>位置合わせ</button
			>
		{/if}
	{/if}
	{#if loading}<p role="status">SRTM HGTを処理しています…</p>{/if}
	{#if error}<p class="text-red-300" role="alert">{error}</p>{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={confirmRegistration}
		disabled={!grid || loading}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {!grid || loading
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}">決定</button
	>
</div>
