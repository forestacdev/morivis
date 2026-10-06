<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import GeometryTypeSelect from './GeometryTypeSelect.svelte';
	import { getUploadPreview } from '../preview-context';
	import {
		createVectorEntryGroup,
		filterByGeometryTypes,
		prepareVectorEntryGroups,
		type VectorEntryGroup
	} from './vector-entry-group';

	import Checkbox from '$routes/map/components/layer_menu/Checkbox.svelte';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import {
		getGeometryTypes,
		groupPropertyByGeometryType,
		filterByProperty,
		buildDmStyle
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import type { DMInfo } from '$routes/map/utils/formats/dm';
	import { analyzeDmFileInWorker } from '$routes/map/utils/formats/dm/analyze';
	import { findDmIndexFiles, getDmFiles } from '$routes/map/utils/formats/dm/zone';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		pendingZoneGeoRefData: PendingZoneGeoRefData | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable()
	}: Props = $props();

	const showPreviewEntries = getUploadPreview();
	let selectedTypes = $state<VectorEntryGeometryType[]>([]);
	let pending: { data: FeatureCollection; groups: VectorEntryGroup[] } | null = null;
	let zoneInfo = $state<DMInfo | null>(null);
	// 平面直角座標のままのGeoJSON（座標変換前）
	let rawGeojson = $state.raw<FeatureCollection | null>(null);
	const geometryTypes = $derived(rawGeojson ? getGeometryTypes(rawGeojson) : []);
	const extractClassName = (props: Record<string, unknown>) =>
		props?.className != null ? String(props.className) : undefined;

	let classNamesByGeometryType = $state<Record<string, string[]> | null>(null);
	let classNameChecked = $state<Record<string, boolean>>({});
	// className → classCode のマッピング
	let classCodeMap = $state<Record<string, string>>({});
	// ジオメトリタイプ → DMデータタイプ（面/線/点/注記等）のマッピング
	let dataTypesByGeometryType = $state<Record<string, string[]>>({});

	// 選択されたclassName一覧（チェック済みのもの）
	const selectedClassNames = $derived(
		Object.entries(classNameChecked)
			.filter(([, v]) => v)
			.map(([k]) => k)
	);

	const visibleClassNames = $derived([
		...new Set(selectedTypes.flatMap((type) => classNamesByGeometryType?.[type] ?? []))
	]);
	const selectedDataTypes = $derived([
		...new Set(selectedTypes.flatMap((type) => dataTypesByGeometryType[type] ?? []))
	]);
	const selectedData = $derived.by(() => {
		if (!rawGeojson) return null;
		const filtered = filterByGeometryTypes(rawGeojson, selectedTypes);
		return visibleClassNames.length
			? filterByProperty(filtered, selectedClassNames, extractClassName)
			: filtered;
	});
	const selectVisibleClasses = (checked: boolean) => {
		classNameChecked = {
			...classNameChecked,
			...Object.fromEntries(visibleClassNames.map((name) => [name, checked]))
		};
	};

	const dmFiles = $derived(dropFile ? getDmFiles(toUploadFiles(dropFile)) : []);
	let selectedDmFile = $state<File | null>(null);
	const dmFile = $derived(
		selectedDmFile && dmFiles.includes(selectedDmFile) ? selectedDmFile : dmFiles[0]
	);
	const indexFiles = $derived(
		dmFile && dropFile ? findDmIndexFiles(dmFile, toUploadFiles(dropFile)) : []
	);
	const zoneSourceLabels = {
		dmi: 'DMIファイル',
		index: 'DM内のインデックス',
		drawing: '図郭番号からの推定'
	};

	// ファイルドロップ時: DM変換（座標変換なし）→ ジオメトリタイプ確認
	$effect(() => {
		let cancelled = false;
		if (dmFile && showDialogType === 'dm') {
			rawGeojson = null;
			zoneInfo = null;
			pending = null;
			selectedTypes = [];
			classNameChecked = {};
			classNamesByGeometryType = null;
			isProcessing.set(true);
			analyzeDmFileInWorker(dmFile, indexFiles)
				.then(({ geojson, info }) => {
					if (cancelled) return;
					zoneInfo = info;
					rawGeojson = geojson as unknown as FeatureCollection;
					selectedTypes = getGeometryTypes(rawGeojson);
					classNamesByGeometryType = groupPropertyByGeometryType(rawGeojson, extractClassName);
					classNameChecked = Object.fromEntries(
						Object.values(classNamesByGeometryType)
							.flat()
							.map((name) => [name, true])
					);

					// className → classCode のマッピングを構築
					const codeMap: Record<string, string> = {};
					for (const feature of rawGeojson.features) {
						const props = feature.properties as Record<string, unknown>;
						const name = props?.className != null ? String(props.className) : undefined;
						const code = props?.classCode != null ? String(props.classCode) : undefined;
						if (name && code && !codeMap[name]) {
							codeMap[name] = code;
						}
					}
					classCodeMap = codeMap;

					dataTypesByGeometryType = groupPropertyByGeometryType(rawGeojson, (props) =>
						props.dataType != null ? String(props.dataType) : undefined
					);
				})
				.catch((e) => {
					if (cancelled) return;
					showNotification('DMファイルの読み込みに失敗しました', 'error');
					console.error(e);
				})
				.finally(() => {
					if (!cancelled) isProcessing.set(false);
				});
		}
		return () => {
			cancelled = true;
			pending = null;
			isProcessing.set(false);
		};
	});

	const openZoneSelection = () => {
		if (!selectedData?.features.length || $isProcessing) return;
		const entryName = zoneInfo?.drawingName || dmFile?.name || 'DMデータ';
		const groups = prepareVectorEntryGroups(selectedData, entryName, 'DM', buildDmStyle);
		pending = { data: selectedData, groups };
		pendingZoneGeoRefData = {
			featureCollection: selectedData,
			entryName,
			vectorGroups: groups,
			suggestedEpsgCode: zoneInfo?.zone ? (String(6668 + zoneInfo.zone) as EpsgCode) : undefined
		};
		zoneConfirmedEpsg = null;
		focusBbox = turfBbox(selectedData) as [number, number, number, number];
		transformOptionMode = 'zone';
	};

	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		const input = pending;
		if (!input) return;
		isProcessing.set(true);
		try {
			const data = (await transformGeoJSONParallel(
				input.data,
				getProjContext(epsgCode)
			)) as FeatureCollection;
			if (input !== pending) return;
			if (!isBboxValid(turfBbox(data)))
				throw new Error('座標変換に失敗しました。系番号を確認してください');
			const entries = await createVectorEntryGroup(data, input.groups);
			if (input !== pending) return;
			showPreviewEntries(entries);
			transformOptionMode = null;
			pendingZoneGeoRefData = null;
			dropFile = null;
			showDialogType = null;
			showNotification('DMファイルを読み込みました', 'success');
		} catch (error) {
			if (input === pending)
				showNotification(error instanceof Error ? error.message : String(error), 'error');
		} finally {
			if (input === pending) isProcessing.set(false);
		}
	};

	const cancel = () => {
		pending = null;
		pendingZoneGeoRefData = null;
		zoneConfirmedEpsg = null;
		transformOptionMode = null;
		dropFile = null;
		showDialogType = null;
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'dm') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-2">
	<span class="text-2xl font-bold">DMファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
>
	{#if dmFiles.length > 1}
		<label class="flex w-full flex-col gap-2 px-2">
			読み込むDMファイル
			<select class="rounded bg-gray-700 p-2" bind:value={selectedDmFile}>
				{#each dmFiles as file (file)}
					<option value={file}>{file.name}</option>
				{/each}
			</select>
		</label>
	{/if}
	{#if zoneInfo?.zone && zoneInfo.zoneSource}
		<p class="w-full px-2 text-sm text-gray-300">
			第{zoneInfo.zone}系（{zoneSourceLabels[zoneInfo.zoneSource]}）。
			次の画面ではJGD2011の候補を選択します。測地系と位置を確認してください。
		</p>
	{:else if zoneInfo}
		<p class="w-full px-2 text-sm text-gray-300">
			{zoneInfo.zoneWarning ?? '系番号を取得できませんでした。次の画面で座標系を選択してください。'}
		</p>
	{/if}
	{#if zoneInfo?.drawingName}
		<div class="w-full px-2 text-gray-300">
			図郭名称: {zoneInfo.drawingName}
		</div>
	{/if}

	{#if geometryTypes.length}
		<GeometryTypeSelect
			options={geometryTypes}
			bind:selected={selectedTypes}
			disabled={$isProcessing}
		/>
		{#if selectedDataTypes.length}
			<div class="flex w-full flex-wrap items-center gap-1 px-2">
				<span class="text-xs text-gray-400">含まれる要素:</span>
				{#each selectedDataTypes as dt (dt)}
					<span class="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">{dt}</span>
				{/each}
			</div>
		{/if}
	{/if}

	{#if visibleClassNames.length}
		<div class="w-full px-2">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-300">クラス名</span>
				<div class="flex gap-2">
					<button
						class="c-btn-sub pointer-events-auto cursor-pointer text-xs"
						onclick={() => selectVisibleClasses(true)}>全選択</button
					>
					<button
						class="c-btn-sub pointer-events-auto cursor-pointer text-xs"
						onclick={() => selectVisibleClasses(false)}>全解除</button
					>
				</div>
			</div>
			<div class="flex flex-col gap-1">
				{#each [...visibleClassNames].sort((a, b) => {
					const codeA = parseInt(classCodeMap[a] ?? '9999', 10);
					const codeB = parseInt(classCodeMap[b] ?? '9999', 10);
					return codeA - codeB;
				}) as className (className)}
					<Checkbox
						label={classCodeMap[className]
							? `${className} (${classCodeMap[className]})`
							: className}
						bind:value={classNameChecked[className]}
					/>
				{/each}
			</div>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={openZoneSelection}
		disabled={$isProcessing || !selectedData?.features.length}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!selectedData?.features.length
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
