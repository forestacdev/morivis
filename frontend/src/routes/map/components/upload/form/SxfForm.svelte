<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import Checkbox from '$routes/map/components/layer_menu/Checkbox.svelte';
	import { createAutoGeoJsonEntry } from '$routes/map/components/upload/form/geojson-entry';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import {
		buildSxfStyle,
		filterByGeometryType,
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

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};

	const COORDINATE_UNIT_OPTIONS: { key: 'auto' | SxfCoordinateUnit; name: string }[] = [
		{ key: 'auto', name: '自動' },
		{ key: 'm', name: 'm' },
		{ key: 'mm', name: 'mm' }
	];
	const SXF_RELATED_EXTENSIONS = ['.sfc', '.p21', '.saf', '.tif', '.tiff'];

	let rawGeojson = $state.raw<FeatureCollection | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let layersByGeometryType = $state<Record<string, string[]> | null>(null);
	let layerChecked = $state<Record<string, boolean>>({});
	let coordinateUnit = $state<'auto' | SxfCoordinateUnit>('auto');
	let accumulatedFiles = $state<File[]>([]);

	const resetAnalysisState = () => {
		rawGeojson = null;
		geometryTypeOptions = [];
		selectedGeometryType = '';
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
	const hasSelectableLayers = $derived(
		!!selectedGeometryType && (layersByGeometryType?.[selectedGeometryType] ?? []).length > 0
	);
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
	const isDecisionDisabled = $derived(
		$isProcessing ||
			!selectedGeometryType ||
			preparedGeojson === null ||
			(hasSelectableLayers && selectedLayers.length === 0)
	);

	const extractLayer = (props: Record<string, unknown>) =>
		props?.layer != null ? String(props.layer) : undefined;

	const applyLayerSelectionDefaults = () => {
		if (!layersByGeometryType || !selectedGeometryType) {
			layerChecked = {};
			return;
		}

		const names = layersByGeometryType[selectedGeometryType] ?? [];
		layerChecked = Object.fromEntries(names.map((name) => [name, true]));
	};

	$effect(() => {
		if (layersByGeometryType && selectedGeometryType) {
			applyLayerSelectionDefaults();
		}
	});

	const getFilteredGeojson = (geojson: FeatureCollection): FeatureCollection => {
		let filtered = filterByGeometryType(geojson, selectedGeometryType as VectorEntryGeometryType);
		if (hasSelectableLayers && selectedLayers.length > 0) {
			filtered = filterByProperty(filtered, selectedLayers, extractLayer);
		}
		return filtered as FeatureCollection;
	};

	$effect(() => {
		if (!sxfFile) return;

		isProcessing.set(true);
		resetAnalysisState();

		sxfFileToGeoJsonInWorker(sxfFile)
			.then((geojson) => {
				rawGeojson = geojson as FeatureCollection;
				const geometryTypes = getGeometryTypes(rawGeojson);

				if (geometryTypes.length === 0) {
					showNotification('SXF から表示できる図形を抽出できませんでした', 'error');
					return;
				}

				if (geometryTypes.length === 1) {
					selectedGeometryType = geometryTypes[0];
					geometryTypeOptions = [];
				} else {
					geometryTypeOptions = geometryTypes.map((geometryType) => ({
						key: geometryType,
						name: GEOMETRY_TYPE_LABELS[geometryType] ?? geometryType
					}));
					selectedGeometryType = geometryTypes[0];
				}

				layersByGeometryType = groupPropertyByGeometryType(rawGeojson, extractLayer);
			})
			.catch((error) => {
				showNotification(
					error instanceof Error ? error.message : 'SXF ファイルの読み込みに失敗しました',
					'error'
				);
				console.error(error);
			})
			.finally(() => {
				isProcessing.set(false);
			});
	});

	const openZoneSelection = () => {
		if (!preparedGeojson || !selectedGeometryType) return;

		const filteredGeojson = getFilteredGeojson(preparedGeojson);
		if (filteredGeojson.features.length === 0) {
			showNotification('選択した条件に一致する図形がありません', 'error');
			return;
		}

		pendingZoneGeoRefData = {
			featureCollection: filteredGeojson,
			entryName
		};
		transformOptionMode = 'zone';
		focusBbox = turfBbox(filteredGeojson) as [number, number, number, number];
	};

	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!preparedGeojson || !selectedGeometryType) return;

		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const transformedGeojson = (await transformGeoJSONParallel(
				preparedGeojson,
				prjContent
			)) as FeatureCollection;
			const geojsonData = getFilteredGeojson(transformedGeojson);

			if (geojsonData.features.length === 0) {
				showNotification('SXF ファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const propKeys = Object.keys(geojsonData.features[0]?.properties ?? {});
			const style = buildSxfStyle(geojsonData, selectedGeometryType, propKeys);
			const entry = await createAutoGeoJsonEntry({
				geojson: geojsonData,
				geometryType: selectedGeometryType,
				name: entryName,
				bbox: bbox as [number, number, number, number],
				style,
				attribution: 'SXF',
				allow3d: false
			});

			if (!entry) {
				showNotification('SXF エントリの作成に失敗しました', 'error');
				return;
			}

			showDataEntry = entry;
			showDialogType = null;
			showNotification('SXF ファイルを読み込みました', 'success');
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'SXF ファイルの変換中にエラーが発生しました',
				'error'
			);
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
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
				transformWithEpsg(epsg);
			});
		}
	});

	const transformWithEpsg = async (epsgCode: EpsgCode) => {
		await convertAndCreateEntry(epsgCode);
	};
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

		{#if geometryTypeOptions.length > 1}
			<div class="w-full p-2">
				<HorizontalSelectBox
					label="ジオメトリタイプを選択"
					bind:group={selectedGeometryType}
					bind:options={geometryTypeOptions}
				/>
			</div>
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
							onclick={applyLayerSelectionDefaults}
						>
							全選択
						</button>
						<button
							class="c-btn-sub pointer-events-auto text-xs"
							onclick={() => {
								const names = layersByGeometryType?.[selectedGeometryType] ?? [];
								layerChecked = Object.fromEntries(names.map((name) => [name, false]));
							}}
						>
							全解除
						</button>
					</div>
				</div>
				<div class="flex flex-col gap-1">
					{#each layersByGeometryType?.[selectedGeometryType] ?? [] as layer (layer)}
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
