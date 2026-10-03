<script lang="ts">
	import bbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import {
		createGeoJsonEntry,
		filterByGeometryType,
		getGeometryTypes
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import type { S57Result } from '$routes/map/utils/formats/s57';
	import { runS57Worker } from '$routes/map/utils/formats/s57/analyze';
	import { getS57Datasets, S57_FILE_ACCEPT } from '$routes/map/utils/formats/s57/files';
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
	const uploadFiles = $derived(toUploadFiles(dropFile));
	const groupedInput = $derived.by(() => {
		try {
			return { datasets: getS57Datasets(uploadFiles), error: '' };
		} catch (cause) {
			return {
				datasets: [],
				error: cause instanceof Error ? cause.message : 'S-57のファイル構成を確認できませんでした'
			};
		}
	});
	const datasets = $derived(groupedInput.datasets);
	let selection = $state.raw<{ batch: UploadFilesInput; index: number } | null>(null);
	const selectedIndex = $derived(selection && selection.batch === dropFile ? selection.index : 0);
	const dataset = $derived(datasets[selectedIndex] ?? datasets[0] ?? null);
	const file = $derived(dataset?.base ?? null);
	let parsedInput = $state.raw<{
		batch: UploadFilesInput;
		file: File;
		result: S57Result;
	} | null>(null);
	const result = $derived(
		parsedInput && parsedInput.batch === dropFile && parsedInput.file === file
			? parsedInput.result
			: null
	);
	let name = $state('');
	let selectedClass = $state<number | null>(null);
	let selectedGeometry = $state<VectorEntryGeometryType>('Point');
	const classData = $derived<FeatureCollection | null>(
		result
			? {
					type: 'FeatureCollection',
					features: result.geojson.features.filter(
						(feature) => selectedClass === null || feature.properties.OBJL === selectedClass
					)
				}
			: null
	);
	const geometryTypes = $derived(classData ? getGeometryTypes(classData) : []);
	const geometry = $derived(
		geometryTypes.includes(selectedGeometry) ? selectedGeometry : (geometryTypes[0] ?? 'Point')
	);
	const selectedData = $derived(classData ? filterByGeometryType(classData, geometry) : null);
	const labels: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};
	let loading = $state(false);
	let error = $state('');
	let controller: AbortController | undefined;

	$effect(() => {
		const selected = file;
		const selectedDataset = dataset;
		const batch = dropFile;
		const task = new AbortController();
		controller = task;
		parsedInput = null;
		selectedClass = null;
		selectedGeometry = 'Point';
		name = selected?.name.replace(/\.000$/i, '') ?? '';
		error = groupedInput.error;
		loading = !!selected;
		if (selected && selectedDataset) {
			untrack(() => {
				const release = beginUploadProcessing(task.signal);
				void (async () => {
					try {
						const parsed = await runS57Worker(selectedDataset, task.signal);
						if (task.signal.aborted || file !== selected || dropFile !== batch) return;
						parsedInput = { batch, file: selected, result: parsed };
						name = parsed.metadata.name || selected.name.replace(/\.000$/i, '');
						selectedGeometry = getGeometryTypes(parsed.geojson)[0] ?? 'Point';
					} catch (cause) {
						if (!task.signal.aborted && file === selected && dropFile === batch)
							error = cause instanceof Error ? cause.message : 'S-57を読み込めませんでした';
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
	const register = async () => {
		if (!result || !selectedData?.features.length || !controller || loading) return;
		const input = file;
		const batch = dropFile;
		const signal = controller.signal;
		if (signal.aborted) return;
		const release = beginUploadProcessing(signal);
		loading = true;
		error = '';
		try {
			const entry = await createGeoJsonEntry(
				selectedData,
				geometry,
				name.trim() || 'S-57',
				bbox(selectedData) as [number, number, number, number]
			);
			if (signal.aborted || file !== input || dropFile !== batch) return;
			if (!entry) throw new Error('S-57のエントリーを作成できませんでした');
			showDataEntry = entry;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			if (!signal.aborted && file === input && dropFile === batch)
				error = cause instanceof Error ? cause.message : 'S-57を登録できませんでした';
		} finally {
			release();
			if (!signal.aborted && file === input && dropFile === batch) loading = false;
		}
	};
	const cancel = () => {
		controller?.abort();
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="pb-4 text-2xl font-bold">S-57 電子海図</div>
<div class="c-scroll flex flex-col gap-4 overflow-y-auto text-sm">
	<p>
		基本ファイル（.000）と更新ファイル（.001以降）をまとめて選択・ドロップしてください。更新を適用した地物と属性を読み込みます。S-52の海図表現は対象外です。
	</p>
	<label class="flex flex-col gap-2">
		S-57ファイル
		<input
			type="file"
			accept={S57_FILE_ACCEPT}
			multiple
			onchange={(event) => {
				const selected = event.currentTarget.files;
				if (selected?.length) {
					controller?.abort();
					dropFile = Array.from(selected);
				}
			}}
		/>
	</label>
	{#if datasets.length > 1}
		<label class="flex flex-col gap-2">
			読み込むファイル
			<select class="rounded bg-zinc-800 p-2" bind:value={() => selectedIndex, selectFile}>
				{#each datasets as item, index (item.base)}
					<option value={index}>{item.base.name}</option>
				{/each}
			</select>
		</label>
	{:else if file}
		<p class="break-all">{file.name}</p>
	{:else}
		<p>.000ファイルを選択してください。</p>
	{/if}
	{#if result}
		<label class="flex flex-col gap-2">
			データ名
			<input class="rounded bg-zinc-800 p-2" bind:value={name} disabled={loading} />
		</label>
		<p>{result.geojson.features.length.toLocaleString()} 地物</p>
		<p>更新番号: {result.metadata.updateNumber}</p>
		{#if result.metadata.edition || result.metadata.issueDate || result.metadata.scale > 0}
			<p>
				{#if result.metadata.edition}版: {result.metadata.edition}{/if}
				{#if result.metadata.issueDate}発行日: {result.metadata.issueDate}{/if}
				{#if result.metadata.scale > 0}編集縮尺: 1:{result.metadata.scale.toLocaleString()}{/if}
			</p>
		{/if}
		{#if result.omittedNonSpatialCount > 0}
			<p>
				図形のない {result.omittedNonSpatialCount.toLocaleString()} 地物は表示対象から除外しました。
			</p>
		{/if}
		{#if result.warnings.length > 0}
			<ul class="list-disc space-y-1 pl-5 text-amber-200">
				{#each [...new Set(result.warnings)] as warning (warning)}
					<li>{warning}</li>
				{/each}
			</ul>
		{/if}
		<label class="flex flex-col gap-2">
			地物分類
			<select class="rounded bg-zinc-800 p-2" bind:value={selectedClass} disabled={loading}>
				<option value={null}>すべて</option>
				{#each result.classes as item (item.code)}
					<option value={item.code}>
						{item.acronym} — {item.name}（{item.count.toLocaleString()} 地物）
					</option>
				{/each}
			</select>
		</label>
		{#if geometryTypes.length}
			<label class="flex flex-col gap-2">
				図形の種類
				<select
					class="rounded bg-zinc-800 p-2"
					bind:value={() => geometry, (value) => (selectedGeometry = value)}
					disabled={loading}
				>
					{#each geometryTypes as type (type)}
						<option value={type}>{labels[type]}</option>
					{/each}
				</select>
			</label>
		{/if}
		<p>選択中: {(selectedData?.features.length ?? 0).toLocaleString()} 地物</p>
		<p>測深値（DEPTH）は属性として保持し、地図上の標高には使用しません。</p>
	{/if}
	{#if loading}<p role="status">S-57を処理しています…</p>{/if}
	{#if error}<p class="text-red-300" role="alert">{error}</p>{/if}
	<div class="flex justify-end gap-2">
		<button class="c-btn-cancel rounded-lg px-4 py-2" onclick={cancel}>キャンセル</button>
		<button
			class="c-btn-confirm rounded-lg px-4 py-2"
			onclick={register}
			disabled={loading || !selectedData?.features.length}>プレビュー</button
		>
	</div>
</div>
