<script lang="ts">
	import { untrack } from 'svelte';

	import type { TransformOptionMode } from './pending-zone-vector';
	import type { GeoRefData, RasterRegistrationMode } from './transform/georef-types';

	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { RawRaster } from '$routes/map/utils/formats/envi-bil';
	import { runRawRasterWorker } from '$routes/map/utils/formats/envi-bil/analyze';
	import { createRawRasterEntry } from '$routes/map/utils/formats/envi-bil/entry';
	import { findRawRasterFiles, isRawRasterHeader } from '$routes/map/utils/formats/envi-bil/files';
	import { createRasterGeoRefData } from '$routes/map/utils/formats/raster/georef';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		geoRefData: GeoRefData | null;
	}
	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();
	const inputFiles = $derived(toUploadFiles(dropFile));
	const files = $derived(inputFiles.filter(isRawRasterHeader));
	let selectedIndex = $state(-1);
	const file = $derived(files.length === 1 ? files[0] : files[selectedIndex]);
	let grid = $state.raw<RawRaster | null>(null);
	let name = $state('');
	let crs = $state('');
	let dataFile = $state.raw<File | null>(null);
	let error = $state('');
	let loading = $state(false);
	let registrationMode = $state<RasterRegistrationMode>('raster');
	let controller: AbortController | undefined;

	$effect(() => {
		const input = file;
		const related = inputFiles;
		const task = new AbortController();
		controller = task;
		grid = null;
		crs = '';
		dataFile = null;
		error = '';
		registrationMode = 'raster';
		name = input?.name.replace(/\.hdr$/i, '') ?? '';
		loading = !!input;
		if (input)
			untrack(() => {
				const releaseProcessing = beginUploadProcessing(task.signal);
				void (async () => {
					try {
						const pair = findRawRasterFiles(related, input);
						const parsed = await runRawRasterWorker({ type: 'parse', files: pair }, task.signal);
						if (task.signal.aborted) return;
						grid = parsed;
						dataFile = pair.data;
						crs = parsed.crs;
						loading = false;
						if (!parsed.transform) placeManually();
						else if (crs) await register(crs, true);
						else selectCrs();
					} catch (cause) {
						if (!task.signal.aborted)
							error =
								cause instanceof Error ? cause.message : 'ENVI／ESRI BILを読み込めませんでした';
					} finally {
						releaseProcessing();
						if (!task.signal.aborted) loading = false;
					}
				})();
			});
		return () => task.abort();
	});

	const register = async (projection: string, selectCrsOnProjectionError = false) => {
		if (!grid || !controller || loading) return;
		const signal = controller.signal;
		const releaseProcessing = beginUploadProcessing(signal);
		const entryName = name.trim() || 'ENVI／ESRI BIL';
		const mode = registrationMode;
		let projectionResolved = false;
		loading = true;
		error = '';
		try {
			const projected = await runRawRasterWorker(
				{ type: 'project', grid, crs: projection },
				signal
			);
			if (signal.aborted) return;
			projectionResolved = true;
			const entry = await createRawRasterEntry(projected, entryName, mode, signal);
			if (signal.aborted) return;
			showDataEntry = entry;
			focusBbox = null;
			transformOptionMode = null;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			if (signal.aborted) return;
			if (selectCrsOnProjectionError && !projectionResolved) {
				loading = false;
				selectCrs();
			} else {
				error = cause instanceof Error ? cause.message : 'ENVI／ESRI BILを登録できませんでした';
			}
		} finally {
			releaseProcessing();
			if (!signal.aborted) loading = false;
		}
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'envi-bil') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				transformOptionMode = null;
				void register(getProjContext(epsg));
			});
		}
	});
	const selectCrs = () => {
		if (!grid?.transform || loading) return;
		error = '';
		zoneConfirmedEpsg = null;
		focusBbox = [...grid.bbox];
		transformOptionMode = 'zone';
	};
	const placeManually = () => {
		if (!grid || !dataFile || loading) return;
		geoRefData = createRasterGeoRefData({
			entryId: `raw_raster_${crypto.randomUUID()}`,
			entryName: name.trim() || 'ENVI／ESRI BIL',
			parsedBands: grid.bands,
			parsedNodata: NaN,
			dataRanges: grid.ranges,
			imageWidth: grid.width,
			imageHeight: grid.height,
			imageFile: dataFile,
			registrationMode,
			allowedTransformModes: ['georef']
		});
		focusBbox = null;
		transformOptionMode = 'georef';
		showDialogType = null;
	};
	const cancel = () => {
		controller?.abort();
		focusBbox = null;
		zoneConfirmedEpsg = null;
		transformOptionMode = null;
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">ENVI／ESRI BIL</div>
<div class="flex flex-col gap-4 text-sm">
	<p>HDRと画像本体を一緒に選択してください。PRJ・ワールドファイルも同時に読み込めます。</p>
	<label class="flex flex-col gap-2"
		>ファイル一式を選び直す
		<input
			type="file"
			multiple
			disabled={loading}
			onchange={(event) => {
				const selected = Array.from(event.currentTarget.files ?? []);
				if (selected.length) {
					selectedIndex = -1;
					dropFile = selected;
				}
			}}
		/>
	</label>
	{#if !files.length}<p role="alert">HDRファイルが必要です。</p>{/if}
	{#if files.length > 1}
		<label class="flex flex-col gap-2"
			>読み込むファイル
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
		<p>{grid.width} 列 × {grid.height} 行 ／ {grid.bandCount} バンド</p>
		<label class="flex flex-col gap-2"
			>登録方法
			<select class="rounded bg-zinc-800 p-2" bind:value={registrationMode} disabled={loading}>
				<option value="raster">ラスター</option>
				{#if grid.bandCount === 1 && grid.width > 1 && grid.height > 1}<option value="mesh"
						>3Dメッシュ</option
					>{/if}
			</select>
		</label>
		{#if registrationMode === 'mesh'}<p>セルの値をメートル単位の高さとして扱います。</p>{/if}
		{#if crs}<p>HDRまたはPRJに座標系の指定があります。</p>{:else}<p>
				座標系が不明です。座標系を選ぶか、地図上で位置を合わせてください。
			</p>{/if}
		<div class="flex flex-wrap gap-2">
			{#if crs && grid.transform}<button
					class="c-btn-confirm rounded-lg px-4 py-2"
					disabled={loading}
					onclick={() => register(crs)}>HDR／PRJの座標系で登録</button
				>{/if}
			<button
				class="c-btn-confirm rounded-lg px-4 py-2"
				disabled={loading || !grid.transform}
				onclick={selectCrs}>座標系を選択</button
			>
			<button class="c-btn-confirm rounded-lg px-4 py-2" disabled={loading} onclick={placeManually}
				>位置合わせ</button
			>
		</div>
	{/if}
	{#if loading}<p role="status">ENVI／ESRI BILを処理しています…</p>{/if}
	{#if error}<p class="text-red-300" role="alert">{error}</p>{/if}
	<div class="flex justify-end">
		<button class="c-btn-cancel rounded-lg px-4 py-2" onclick={cancel}>キャンセル</button>
	</div>
</div>
