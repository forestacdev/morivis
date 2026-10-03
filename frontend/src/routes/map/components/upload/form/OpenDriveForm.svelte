<script lang="ts">
	import bbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import type { PendingZoneGeoRefData, TransformOptionMode } from './pending-zone-vector';
	import type { GeoRefData } from './transform/georef-types';

	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import { createGeoJsonEntry, filterByGeometryType } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { hasFormatExtension } from '$routes/map/utils/formats/format-definition';
	import type { OpenDriveResult } from '$routes/map/utils/formats/opendrive';
	import { runOpenDriveWorker } from '$routes/map/utils/formats/opendrive/analyze';
	import { formatOpenDrive } from '$routes/map/utils/formats/opendrive/definition';
	import type { EpsgCode } from '$routes/map/utils/proj/dict';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		geoRefData: GeoRefData | null;
		pendingZoneGeoRefData: PendingZoneGeoRefData | null;
	}
	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		geoRefData = $bindable(),
		pendingZoneGeoRefData = $bindable()
	}: Props = $props();
	const extensions = [...formatOpenDrive.extensions, '.xml'];
	const uploadFiles = $derived(toUploadFiles(dropFile));
	const files = $derived(uploadFiles.filter((item) => hasFormatExtension(item.name, extensions)));
	let fileInput = $state<HTMLInputElement | null>(null);
	let selection = $state.raw<{ batch: UploadFilesInput; index: number } | null>(null);
	const selectedIndex = $derived(selection && selection.batch === dropFile ? selection.index : 0);
	const file = $derived(files[selectedIndex] ?? files[0] ?? null);
	let parsedInput = $state.raw<{
		batch: UploadFilesInput;
		file: File;
		result: OpenDriveResult;
	} | null>(null);
	const result = $derived(
		parsedInput && parsedInput.batch === dropFile && parsedInput.file === file
			? parsedInput.result
			: null
	);
	type DisplayKind = 'reference-line' | 'lane';
	let selectedKind = $state<DisplayKind>('lane');
	let selectedLaneType = $state<string | null>(null);
	const hasLanes = $derived(
		result?.geojson.features.some((item) => item.properties.kind === 'lane')
	);
	const hasReferenceLines = $derived(
		result?.geojson.features.some((item) => item.properties.kind === 'reference-line')
	);
	const laneTypes = $derived(
		result
			? [
					...new Set(
						result.geojson.features.flatMap((item) =>
							item.properties.kind === 'lane' && typeof item.properties.lane_type === 'string'
								? [item.properties.lane_type]
								: []
						)
					)
				].sort()
			: []
	);
	const geometryFor = (kind: DisplayKind): VectorEntryGeometryType =>
		kind === 'lane' ? 'Polygon' : 'LineString';
	const filterSelected = (
		data: FeatureCollection,
		kind: DisplayKind,
		laneType: string | null
	): FeatureCollection => ({
		type: 'FeatureCollection',
		features: filterByGeometryType(data, geometryFor(kind)).features.filter(
			(item) =>
				item.properties.kind === kind &&
				(kind !== 'lane' || laneType === null || item.properties.lane_type === laneType)
		)
	});
	const selectedData = $derived(
		result ? filterSelected(result.geojson, selectedKind, selectedLaneType) : null
	);
	let name = $state('');
	let loading = $state(false);
	let error = $state('');
	let controller: AbortController | undefined;

	$effect(() => {
		const selected = file;
		const batch = dropFile;
		const task = new AbortController();
		controller = task;
		parsedInput = null;
		selectedKind = 'lane';
		selectedLaneType = null;
		pendingZoneGeoRefData = null;
		zoneConfirmedEpsg = null;
		focusBbox = null;
		transformOptionMode = null;
		geoRefData = null;
		name = selected?.name.replace(/\.[^.]+$/, '') ?? '';
		error = '';
		loading = !!selected;
		if (selected) {
			untrack(() => {
				const release = beginUploadProcessing(task.signal);
				void (async () => {
					try {
						const parsed = await runOpenDriveWorker({ file: selected }, task.signal);
						if (task.signal.aborted || file !== selected || dropFile !== batch) return;
						parsedInput = { batch, file: selected, result: parsed };
						name = parsed.metadata.name || selected.name.replace(/\.[^.]+$/, '');
						selectedKind = parsed.geojson.features.some((item) => item.properties.kind === 'lane')
							? 'lane'
							: 'reference-line';
					} catch (cause) {
						if (!task.signal.aborted && file === selected && dropFile === batch)
							error = cause instanceof Error ? cause.message : 'OpenDRIVEを読み込めませんでした';
					} finally {
						release();
						if (!task.signal.aborted && file === selected && dropFile === batch) loading = false;
					}
				})();
			});
		}
		return () => task.abort();
	});

	const selectFile = (index: number) => {
		controller?.abort();
		selection = { batch: dropFile, index };
	};
	const selectCrs = () => {
		if (!selectedData?.features.length || loading) return;
		zoneConfirmedEpsg = null;
		focusBbox = bbox(selectedData) as [number, number, number, number];
		pendingZoneGeoRefData = {
			featureCollection: selectedData,
			entryName: name.trim() || 'OpenDRIVE',
			attribution: 'OpenDRIVE'
		};
		transformOptionMode = 'zone';
	};
	const register = async (sourceCrs?: string) => {
		if (!result || !file || !selectedData?.features.length || !controller || loading) return;
		if (result.spatialStatus === 'crs-missing' && !sourceCrs) {
			selectCrs();
			return;
		}
		const input = file;
		const batch = dropFile;
		const kind = selectedKind;
		const laneType = selectedLaneType;
		const entryName = name.trim() || 'OpenDRIVE';
		const signal = controller.signal;
		if (signal.aborted) return;
		const isCurrent = () => !signal.aborted && file === input && dropFile === batch;
		const release = beginUploadProcessing(signal);
		loading = true;
		error = '';
		try {
			const parsed = sourceCrs
				? await runOpenDriveWorker({ file: input, sourceCrs }, signal)
				: result;
			if (!isCurrent()) return;
			if (parsed.spatialStatus !== 'resolved')
				throw new Error('座標系を確認できませんでした。座標系を選び直してください');
			const geojson = filterSelected(parsed.geojson, kind, laneType);
			if (!geojson.features.length) throw new Error('選択した条件に一致する図形がありません');
			const entry = await createGeoJsonEntry(
				geojson,
				geometryFor(kind),
				entryName,
				bbox(geojson) as [number, number, number, number]
			);
			if (!isCurrent()) return;
			if (!entry) throw new Error('OpenDRIVEのエントリーを作成できませんでした');
			showDataEntry = entry;
			pendingZoneGeoRefData = null;
			focusBbox = null;
			transformOptionMode = null;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			if (isCurrent())
				error = cause instanceof Error ? cause.message : 'OpenDRIVEを登録できませんでした';
		} finally {
			release();
			if (isCurrent()) loading = false;
		}
	};
	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'opendrive') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				transformOptionMode = null;
				void register(`EPSG:${epsg}`);
			});
		}
	});
	const cancel = () => {
		controller?.abort();
		pendingZoneGeoRefData = null;
		zoneConfirmedEpsg = null;
		focusBbox = null;
		geoRefData = null;
		transformOptionMode = null;
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">OpenDRIVE</div>
<div class="c-scroll flex min-h-0 grow flex-col gap-4 overflow-y-auto text-sm">
	<p>
		道路の基準線と車線の面を2Dで表示します。道路標示の描画、道路上の物体・信号、3Dの路面は対象外です。
	</p>
	<div class="flex flex-col items-start gap-2">
		<span>OpenDRIVEファイル</span>
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
			aria-label="OpenDRIVEファイル"
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
		<label class="flex flex-col gap-2"
			>読み込むファイル
			<select class="rounded bg-zinc-800 p-2" bind:value={() => selectedIndex, selectFile}>
				{#each files as item, index (item)}<option value={index}>{item.name}</option>{/each}
			</select>
		</label>
	{:else if file}<p class="break-all">{file.name}</p>{/if}
	{#if result}
		<label class="flex flex-col gap-2"
			>データ名
			<input class="rounded bg-zinc-800 p-2" bind:value={name} disabled={loading} />
		</label>
		<p>
			道路: {result.metadata.roadCount.toLocaleString()}件 / 車線: {result.metadata.laneCount.toLocaleString()}件
		</p>
		{#if result.metadata.version}<p>OpenDRIVE {result.metadata.version}</p>{/if}
		{#if result.warnings.length}
			<ul class="list-disc space-y-1 pl-5 text-amber-200">
				{#each [...new Set(result.warnings)] as warning (warning)}<li>{warning}</li>{/each}
			</ul>
		{/if}
		<label class="flex flex-col gap-2"
			>表示対象
			<select class="rounded bg-zinc-800 p-2" bind:value={selectedKind} disabled={loading}>
				{#if hasReferenceLines}<option value="reference-line">道路の基準線</option>{/if}
				{#if hasLanes}<option value="lane">車線（面）</option>{/if}
			</select>
		</label>
		{#if selectedKind === 'lane' && laneTypes.length}
			<label class="flex flex-col gap-2"
				>車線の種類
				<select class="rounded bg-zinc-800 p-2" bind:value={selectedLaneType} disabled={loading}>
					<option value={null}>すべて</option>
					{#each laneTypes as type (type)}<option value={type}>{type}</option>{/each}
				</select>
			</label>
		{/if}
		<p>選択中: {(selectedData?.features.length ?? 0).toLocaleString()}地物</p>
	{/if}
	{#if loading}<p role="status">OpenDRIVEを処理しています…</p>{/if}
	{#if error}<p class="text-red-300" role="alert">{error}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button class="c-btn-sub cursor-pointer p-4 text-lg" onclick={cancel}>キャンセル</button>
	<button
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg disabled:cursor-not-allowed disabled:opacity-50"
		onclick={() => register()}
		disabled={loading || !selectedData?.features.length}>登録</button
	>
</div>
