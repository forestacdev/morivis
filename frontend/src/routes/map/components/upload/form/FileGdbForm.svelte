<script lang="ts">
	import turfBbox from '@turf/bbox';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { createGeoJsonEntry, filterByGeometryType } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';
	import {
		getFileGdbGeometryTypes,
		getFileGdbInputName,
		type FileGdbFailureDetails,
		type FileGdbAnalyzeResult
	} from '$routes/map/utils/formats/filegdb';
	import { analyzeFileGdbFilesInWorker } from '$routes/map/utils/formats/filegdb/analyze';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};
	const logFileGdbDebug = (message: string, payload?: unknown) => {
		if (!import.meta.env.DEV) return;

		if (payload === undefined) {
			console.debug('[FileGDB form]', message);
			return;
		}

		console.debug('[FileGDB form]', message, payload);
	};

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	let parsed = $state<FileGdbAnalyzeResult | null>(null);
	let loadedFileKey = $state('');
	let autoRegisteredKey = $state('');
	let selectedLayerName = $state('');
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);

	const inputFiles = $derived.by(() => toUploadFiles(dropFile));
	const layerOptions = $derived.by(() =>
		parsed
			? parsed.layers.map((layer) => ({
					key: layer.name,
					name: `${layer.name} (${layer.geojson.features.length}件)`
				}))
			: []
	);
	const selectedLayer = $derived.by(
		() => parsed?.layers.find((layer) => layer.name === selectedLayerName) ?? null
	);
	const entryName = $derived.by(() => {
		if (!parsed) return 'FileGDBデータ';
		if (!selectedLayerName || parsed.layers.length === 1) return parsed.datasetName;
		return `${parsed.datasetName} / ${selectedLayerName}`;
	});
	const confirmDisabled = $derived(
		$isProcessing || !selectedLayer || !selectedGeometryType || geometryTypeOptions.length === 0
	);

	const createInputKey = (files: File[]): string =>
		files
			.map((file) => `${getFileGdbInputName(file)}:${file.size}:${file.lastModified}`)
			.sort()
			.join('|');

	const clearParsedState = () => {
		parsed = null;
		autoRegisteredKey = '';
		selectedLayerName = '';
		selectedGeometryType = '';
		geometryTypeOptions = [];
	};

	const resetState = () => {
		clearParsedState();
		loadedFileKey = '';
	};

	const getFileGdbErrorMessage = (error: unknown): string => {
		if (!(error instanceof Error)) {
			return 'FileGDB の読み込みに失敗しました';
		}

		if (error.message.includes('outside the bounds of the buffer')) {
			return 'FileGDB の内部テーブルを解釈できませんでした。現在の FileGDB パーサーでは読めない構成の可能性があります。';
		}

		return error.message;
	};

	const getFileGdbFailureDetails = (error: unknown): FileGdbFailureDetails | null => {
		const details = (error as Error & { details?: unknown })?.details;
		if (!details || typeof details !== 'object') return null;
		return details as FileGdbFailureDetails;
	};

	const logFileGdbFailureDetails = (details: FileGdbFailureDetails | null) => {
		if (!details) return;

		console.groupCollapsed('[FileGDB form] failure details');
		console.debug('[FileGDB form] summary', {
			datasetName: details.datasetName,
			rootPath: details.rootPath,
			firstError: details.firstError,
			lastError: details.lastError
		});
		console.debug('[FileGDB form] inputs', details.inputs);
		console.debug('[FileGDB form] events', details.events);
		console.groupEnd();
	};

	const cancel = () => {
		resetState();
		dropFile = null;
		showDialogType = null;
	};

	const initializeFiles = async (files: File[]) => {
		isProcessing.set(true);
		logFileGdbDebug('initialize start', {
			fileKey: createInputKey(files),
			files: files.map((file) => ({
				name: getFileGdbInputName(file),
				bytes: file.size
			}))
		});

		try {
			const result = await analyzeFileGdbFilesInWorker(files);
			logFileGdbDebug('worker result received', {
				datasetName: result.datasetName,
				layerNames: result.layers.map((layer) => layer.name)
			});
			parsed = result;

			const firstLayer = result.layers[0];
			if (!firstLayer) {
				showNotification('読み込み可能な FileGDB レイヤーが見つかりませんでした', 'error');
				return;
			}

			selectedLayerName = firstLayer.name;
		} catch (error) {
			clearParsedState();
			const failureDetails = getFileGdbFailureDetails(error);
			logFileGdbDebug('initialize failed', {
				fileKey: createInputKey(files),
				error: error instanceof Error ? error.message : String(error),
				failureDetails
			});
			logFileGdbFailureDetails(failureDetails);
			showNotification(getFileGdbErrorMessage(error), 'error');
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const registration = async () => {
		if (!selectedLayer || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const filteredGeojson = filterByGeometryType(selectedLayer.geojson, selectedGeometryType);
			if (!filteredGeojson || filteredGeojson.features.length === 0) {
				showNotification('選択したジオメトリのフィーチャが見つかりませんでした', 'error');
				return;
			}

			const bbox = turfBbox(filteredGeojson) as [number, number, number, number];
			if (!isBboxValid(bbox)) {
				showNotification('FileGDB レイヤーの座標範囲を解釈できませんでした', 'error');
				return;
			}

			const entry = await createGeoJsonEntry(
				filteredGeojson,
				selectedGeometryType,
				entryName,
				bbox,
				undefined,
				{ attribution: 'Esri FileGDB' }
			);

			if (!entry) {
				showNotification('FileGDB の登録に失敗しました', 'error');
				return;
			}

			showDataEntry = entry;
			showNotification('FileGDB を読み込みました', 'success');
			cancel();
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'FileGDB の登録に失敗しました',
				'error'
			);
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	$effect(() => {
		if (showDialogType !== 'filegdb') return;
		if (inputFiles.length === 0) return;

		const nextKey = createInputKey(inputFiles);
		if (nextKey === loadedFileKey) return;

		logFileGdbDebug('effect scheduled initialize', {
			nextKey,
			fileCount: inputFiles.length
		});
		loadedFileKey = nextKey;
		void initializeFiles(inputFiles);
	});

	$effect(() => {
		if (!parsed || !selectedLayerName) return;

		const layer = parsed.layers.find((candidate) => candidate.name === selectedLayerName);
		if (!layer) return;

		const geometryTypes = getFileGdbGeometryTypes(layer.geojson);
		geometryTypeOptions = geometryTypes.map((geometryType) => ({
			key: geometryType,
			name: GEOMETRY_TYPE_LABELS[geometryType] ?? geometryType
		}));

		if (!geometryTypes.includes(selectedGeometryType as VectorEntryGeometryType)) {
			selectedGeometryType = geometryTypes[0] ?? '';
		}
	});

	$effect(() => {
		if (showDialogType !== 'filegdb') return;
		if (!parsed || !selectedLayer || !selectedGeometryType) return;
		if (parsed.layers.length !== 1 || geometryTypeOptions.length !== 1) return;

		const nextAutoRegisteredKey = `${loadedFileKey}:${selectedLayer.name}:${selectedGeometryType}`;
		if (nextAutoRegisteredKey === autoRegisteredKey) return;

		autoRegisteredKey = nextAutoRegisteredKey;
		logFileGdbDebug('effect scheduled auto registration', {
			autoRegisteredKey: nextAutoRegisteredKey
		});
		void registration();
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">FileGDBの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<div class="w-full space-y-4 p-2 text-sm">
		{#if parsed}
			<div class="space-y-1 text-gray-300">
				<div>データセット: {parsed.datasetName}</div>
				<div>対象ファイル: {inputFiles.length}件</div>
				<div>レイヤー数: {parsed.layers.length}</div>
			</div>

			{#if layerOptions.length > 1}
				<HorizontalSelectBox
					label="読み込むレイヤーを選択"
					bind:group={selectedLayerName}
					options={layerOptions}
				/>
			{:else if layerOptions.length === 1}
				<p>読み込みレイヤー: {layerOptions[0]?.name}</p>
			{/if}

			{#if geometryTypeOptions.length > 1}
				<HorizontalSelectBox
					label="ジオメトリタイプを選択"
					bind:group={selectedGeometryType}
					options={geometryTypeOptions}
				/>
			{:else if geometryTypeOptions.length === 1}
				<p>ジオメトリタイプ: {geometryTypeOptions[0]?.name}</p>
			{:else if selectedLayer}
				<p class="text-red-300">このレイヤーには対応しているジオメトリがありません。</p>
			{/if}
		{:else}
			<p class="text-gray-300">FileGDB を解析しています。</p>
		{/if}
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={registration}
		disabled={confirmDisabled}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg"
	>
		決定
	</button>
</div>
