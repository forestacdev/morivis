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

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import Checkbox from '$routes/map/components/layer_menu/Checkbox.svelte';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import {
		buildSxfStyle,
		filterByProperty,
		getGeometryTypes,
		groupPropertyByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { sxfFileToGeoJsonInWorker } from '$routes/map/utils/formats/sxf/analyze';
	import {
		inferSxfCoordinateUnit,
		scaleSxfFeatureCollection,
		type SxfCoordinateUnit
	} from '$routes/map/utils/formats/sxf/units';
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
		isDragover?: boolean;
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
		isDragover = false,
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable()
	}: Props = $props();

	const showPreviewEntries = getUploadPreview();
	let selectedTypes = $state<VectorEntryGeometryType[]>([]);
	let pending: { data: FeatureCollection; groups: VectorEntryGroup[] } | null = null;

	const COORDINATE_UNIT_OPTIONS: { key: 'auto' | SxfCoordinateUnit; name: string }[] = [
		{ key: 'auto', name: '自動' },
		{ key: 'm', name: 'm' },
		{ key: 'mm', name: 'mm' }
	];
	const SXF_RELATED_EXTENSIONS = ['.sfc', '.p21', '.saf', '.tif', '.tiff'];

	let rawGeojson = $state.raw<FeatureCollection | null>(null);
	const geometryTypes = $derived(rawGeojson ? getGeometryTypes(rawGeojson) : []);
	let layersByGeometryType = $state<Record<string, string[]> | null>(null);
	let layerChecked = $state<Record<string, boolean>>({});
	let coordinateUnit = $state<'auto' | SxfCoordinateUnit>('auto');
	let accumulatedFiles = $state<File[]>([]);

	const resetAnalysisState = () => {
		rawGeojson = null;
		selectedTypes = [];
		pending = null;
		layersByGeometryType = null;
		layerChecked = {};
		coordinateUnit = 'auto';
	};

	const getFileKey = (file: File) => {
		const relativePath =
			(file as File & { morivisRelativePath?: string }).morivisRelativePath ?? '';
		return `${relativePath}:${file.name}:${file.size}:${file.lastModified}`;
	};

	const isSxfRelatedFile = (file: File) =>
		SXF_RELATED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

	const mergeAccumulatedFiles = (files: File[]) => {
		const nextFiles = files.filter(isSxfRelatedFile);
		if (nextFiles.length === 0) return;

		const merged: Record<string, File> = Object.fromEntries(
			accumulatedFiles.map((file) => [getFileKey(file), file])
		);
		for (const file of nextFiles) {
			merged[getFileKey(file)] = file;
		}
		accumulatedFiles = Object.values(merged);
	};

	const findLastMatchingFile = (files: File[], predicate: (file: File) => boolean) => {
		for (let index = files.length - 1; index >= 0; index -= 1) {
			const file = files[index];
			if (file && predicate(file)) {
				return file;
			}
		}

		return null;
	};

	$effect(() => {
		if (showDialogType !== 'sxf' || !dropFile) return;

		mergeAccumulatedFiles(toUploadFiles(dropFile));
		dropFile = null;
	});

	const sxfFile = $derived.by(() => {
		if (accumulatedFiles.length === 0) return null;
		return (
			findLastMatchingFile(accumulatedFiles, (file) => file.name.toLowerCase().endsWith('.sfc')) ??
			findLastMatchingFile(accumulatedFiles, (file) => file.name.toLowerCase().endsWith('.p21'))
		);
	});
	const displayFile = $derived(sxfFile ?? accumulatedFiles[0] ?? null);
	const entryName = $derived(displayFile?.name.replace(/\.[^.]+$/, '') ?? 'SXFデータ');
	const waitingForPrimaryFile = $derived(accumulatedFiles.length > 0 && !sxfFile);
	const accumulatedFileNames = $derived(accumulatedFiles.map((file) => file.name));
	const selectedLayers = $derived(
		Object.entries(layerChecked)
			.filter(([, checked]) => checked)
			.map(([layer]) => layer)
	);
	const visibleLayers = $derived([
		...new Set(selectedTypes.flatMap((type) => layersByGeometryType?.[type] ?? []))
	]);
	const hasSelectableLayers = $derived(visibleLayers.length > 0);
	const resolvedCoordinateUnit = $derived.by(() =>
		coordinateUnit === 'auto'
			? rawGeojson
				? inferSxfCoordinateUnit(rawGeojson)
				: 'm'
			: coordinateUnit
	);
	const preparedGeojson = $derived.by(() =>
		rawGeojson ? scaleSxfFeatureCollection(rawGeojson, resolvedCoordinateUnit) : null
	);
	const coordinateUnitMessage = $derived.by(() => {
		if (!rawGeojson) return '';
		if (coordinateUnit === 'auto') {
			return resolvedCoordinateUnit === 'mm'
				? '自動判定で mm とみなし、m に補正してから座標変換します'
				: '自動判定で m のまま座標変換します';
		}

		return resolvedCoordinateUnit === 'mm'
			? 'mm を m に補正してから座標変換します'
			: 'm のまま座標変換します';
	});

	const extractLayer = (props: Record<string, unknown>) =>
		props?.layer != null ? String(props.layer) : undefined;
	const selectVisibleLayers = (checked: boolean) => {
		layerChecked = {
			...layerChecked,
			...Object.fromEntries(visibleLayers.map((name) => [name, checked]))
		};
	};
	const selectedData = $derived.by(() => {
		if (!preparedGeojson) return null;
		const filtered = filterByGeometryTypes(preparedGeojson, selectedTypes);
		return hasSelectableLayers
			? filterByProperty(filtered, selectedLayers, extractLayer)
			: filtered;
	});

	const isDecisionDisabled = $derived($isProcessing || !selectedData?.features.length);

	$effect(() => {
		if (!sxfFile || showDialogType !== 'sxf') return;
		let cancelled = false;

		isProcessing.set(true);
		resetAnalysisState();

		sxfFileToGeoJsonInWorker(sxfFile)
			.then((geojson) => {
				if (cancelled) return;
				rawGeojson = geojson as FeatureCollection;
				const geometryTypes = getGeometryTypes(rawGeojson);

				if (geometryTypes.length === 0) {
					showNotification('SXF から表示できる図形を抽出できませんでした', 'error');
					return;
				}

				selectedTypes = geometryTypes;
				layersByGeometryType = groupPropertyByGeometryType(rawGeojson, extractLayer);
				layerChecked = Object.fromEntries(
					Object.values(layersByGeometryType)
						.flat()
						.map((name) => [name, true])
				);
			})
			.catch((error) => {
				if (cancelled) return;
				showNotification(
					error instanceof Error ? error.message : 'SXF ファイルの読み込みに失敗しました',
					'error'
				);
				console.error(error);
			})
			.finally(() => {
				if (!cancelled) isProcessing.set(false);
			});
		return () => {
			cancelled = true;
			pending = null;
			isProcessing.set(false);
		};
	});

	const openZoneSelection = () => {
		if (!selectedData?.features.length || $isProcessing) return;
		const groups = prepareVectorEntryGroups(selectedData, entryName, 'SXF', buildSxfStyle);
		pending = { data: selectedData, groups };
		pendingZoneGeoRefData = {
			featureCollection: selectedData,
			entryName,
			vectorGroups: groups
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
				throw new Error('座標変換に失敗しました。座標系を確認してください');
			const entries = await createVectorEntryGroup(data, input.groups);
			if (input !== pending) return;
			showPreviewEntries(entries);
			transformOptionMode = null;
			pendingZoneGeoRefData = null;
			dropFile = null;
			showDialogType = null;
			showNotification('SXFファイルを読み込みました', 'success');
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
		if (showDialogType === 'sxf') return;

		accumulatedFiles = [];
		resetAnalysisState();
	});

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'sxf') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				void convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex h-full w-full flex-col">
	<div class="flex shrink-0 items-center justify-between overflow-auto pb-2">
		<span class="text-2xl font-bold">SXF (SFC / P21) ファイルの登録</span>
	</div>

	<div
		class="c-scroll flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
	>
		{#if displayFile}
			<div class="w-full px-2 text-sm text-gray-300">
				{sxfFile ? '本体ファイル' : '受け取り済みファイル'}: {displayFile.name}
			</div>
		{/if}

		{#if waitingForPrimaryFile}
			<div
				class="border-sub bg-base/40 w-full rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors {isDragover
					? 'border-main bg-main/10'
					: ''}"
			>
				<div class="text-base text-white">
					`.saf` を受け取りました。`.sfc` または `.p21` を追加ドロップしてください。
				</div>
				<div class="mt-2 text-sm text-gray-400">このオーバーレイ全体に追加ドロップできます。</div>
				{#if accumulatedFileNames.length > 0}
					<div class="mt-3 text-xs text-gray-500">
						現在: {accumulatedFileNames.join(', ')}
					</div>
				{/if}
			</div>
		{/if}

		{#if geometryTypes.length}
			<GeometryTypeSelect
				options={geometryTypes}
				bind:selected={selectedTypes}
				disabled={$isProcessing}
			/>
		{/if}

		{#if rawGeojson}
			<div class="w-full p-2">
				<HorizontalSelectBox
					label="座標単位"
					bind:group={coordinateUnit}
					options={COORDINATE_UNIT_OPTIONS}
				/>
				<div class="mt-2 text-xs text-gray-400">{coordinateUnitMessage}</div>
			</div>
		{/if}

		{#if hasSelectableLayers}
			<div class="w-full px-2">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm text-gray-300">レイヤー</span>
					<div class="flex gap-2">
						<button
							class="c-btn-sub pointer-events-auto text-xs"
							onclick={() => selectVisibleLayers(true)}
						>
							全選択
						</button>
						<button
							class="c-btn-sub pointer-events-auto text-xs"
							onclick={() => selectVisibleLayers(false)}
						>
							全解除
						</button>
					</div>
				</div>
				<div class="flex flex-col gap-1">
					{#each visibleLayers as layer (layer)}
						<Checkbox label={layer} bind:value={layerChecked[layer]} />
					{/each}
				</div>
			</div>
		{/if}

		<div class="w-full px-2 text-sm text-gray-400">
			初期対応では線・折線・円・円弧・文字の一部だけを GeoJSON 化して読み込みます。
		</div>
	</div>

	<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
		<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
		<button
			onclick={openZoneSelection}
			disabled={isDecisionDisabled}
			class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {isDecisionDisabled
				? 'cursor-not-allowed opacity-50'
				: ''}"
		>
			決定
		</button>
	</div>
</div>
