<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { flushSync, untrack } from 'svelte';

	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import type { GeoRefData } from '$routes/map/components/upload/form/transform/georef-types';
	import { getAllowedTransformModesForIssue } from '$routes/map/components/upload/transform-policy';
	import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import type { TabularRow } from '$routes/map/utils/formats/tabular';
	import { featureCollectionToGeoRefData } from '$routes/map/utils/formats/vector/rasterize';
	import { getXlsxPreview, xlsxFileToGeojson } from '$routes/map/utils/formats/xlsx';
	import {
		readXlsxDrawingWorkbook,
		type XlsxDrawing,
		type XlsxDrawingWorkbook
	} from '$routes/map/utils/formats/xlsx/drawings';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { getDefaultGeoRefCorners } from '$routes/map/utils/transform/georef/default-corners';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { mapStore } from '$routes/stores/map';
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
		geoRefData: GeoRefData | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();

	let headers = $state<string[]>([]);
	let previewRows = $state<TabularRow[]>([]);
	let sheetNames = $state<string[]>([]);
	let selectedSheet = $state<string>('');
	let workbook = $state.raw<XlsxDrawingWorkbook | null>(null);
	let drawing = $state.raw<XlsxDrawing | null>(null);
	let readMode = $state<'drawing' | 'table'>('drawing');
	let loadingWorkbook = $state(false);
	let loadingDrawing = $state(false);
	let loadingTable = $state(false);
	let loadError = $state('');
	let tableError = $state('');
	let latColumn = $state<string>('');
	let lonColumn = $state<string>('');
	const loading = $derived(loadingWorkbook || loadingDrawing || loadingTable);
	const canSubmit = $derived(
		!loading &&
			!$isProcessing &&
			(readMode === 'drawing'
				? !!drawing?.featureCollection.features.length
				: !!latColumn && !!lonColumn)
	);
	const drawingBounds = $derived(
		drawing?.featureCollection.features.length ? turfBbox(drawing.featureCollection) : [0, 0, 1, 1]
	);
	const drawingViewBox = $derived(
		`${drawingBounds[0]} ${-drawingBounds[3]} ${Math.max(1, drawingBounds[2] - drawingBounds[0])} ${Math.max(1, drawingBounds[3] - drawingBounds[1])}`
	);
	let rawGeojson: FeatureCollection | null = null;
	let previewTableContainer = $state<HTMLDivElement | null>(null);

	const sourceFile = $derived.by(() => {
		if (!dropFile) return null;
		return getFirstUploadFile(dropFile);
	});

	const entryName = $derived(sourceFile?.name.replace(/\.[^.]+$/, '') ?? 'Excelデータ');

	const LAT_PATTERNS = ['lat', 'latitude', '緯度', 'y'];
	const LON_PATTERNS = ['lon', 'lng', 'longitude', '経度', 'x'];

	const guessColumn = (names: string[], patterns: string[]): string => {
		for (const pattern of patterns) {
			const found = names.find((name) => name.toLowerCase() === pattern);
			if (found) return found;
		}
		for (const pattern of patterns) {
			const found = names.find((name) => name.toLowerCase().includes(pattern));
			if (found) return found;
		}
		return '';
	};

	const snapPreviewToAutoSelectedColumn = async (
		headerNames: string[],
		selectedColumnNames: string[]
	) => {
		const selectedColumns = selectedColumnNames.filter(
			(columnName): columnName is string => columnName.length > 0
		);
		if (selectedColumns.length === 0) return;

		const targetColumnIndex = headerNames.findIndex((header) => selectedColumns.includes(header));
		if (targetColumnIndex < 0) return;

		flushSync();
		const container = previewTableContainer;
		if (!container) return;

		const targetHeader = container.querySelector<HTMLElement>(
			`[data-preview-column-index="${targetColumnIndex}"]`
		);

		targetHeader?.scrollIntoView({
			block: 'nearest',
			inline: 'center',
			behavior: 'smooth'
		});
	};

	$effect(() => {
		const file = sourceFile;
		let cancelled = false;
		workbook = null;
		drawing = null;
		selectedSheet = '';
		sheetNames = [];
		headers = [];
		previewRows = [];
		latColumn = '';
		lonColumn = '';
		rawGeojson = null;
		loadError = '';
		loadingWorkbook = false;
		if (!file) return;
		loadingWorkbook = true;
		file
			.arrayBuffer()
			.then(readXlsxDrawingWorkbook)
			.then((result) => {
				if (cancelled) return;
				workbook = result;
				sheetNames = result.sheetNames;
				selectedSheet = result.sheetNames[0] ?? '';
			})
			.catch((error) => {
				if (!cancelled)
					loadError =
						error instanceof Error ? error.message : 'Excelファイルの読み込みに失敗しました';
			})
			.finally(() => {
				if (!cancelled) loadingWorkbook = false;
			});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const currentWorkbook = workbook;
		const sheet = selectedSheet;
		let cancelled = false;
		drawing = null;
		loadingDrawing = false;
		if (!currentWorkbook || !sheet) return;
		loadingDrawing = true;
		loadError = '';
		currentWorkbook
			.readSheet(sheet)
			.then((result) => {
				if (cancelled) return;
				drawing = result;
				readMode = result.shapeCount > 0 ? 'drawing' : 'table';
			})
			.catch((error) => {
				if (cancelled) return;
				loadError = error instanceof Error ? error.message : '図面の読み込みに失敗しました';
				readMode = 'table';
			})
			.finally(() => {
				if (!cancelled) loadingDrawing = false;
			});
		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const file = sourceFile;
		const sheet = selectedSheet;
		let cancelled = false;
		headers = [];
		previewRows = [];
		latColumn = '';
		lonColumn = '';
		tableError = '';
		loadingTable = false;
		if (!file || !sheet || readMode !== 'table') return;
		loadingTable = true;
		getXlsxPreview(file, sheet)
			.then((preview) => {
				if (cancelled) return;
				headers = preview.headers;
				previewRows = preview.rows;
				latColumn = guessColumn(preview.headers, LAT_PATTERNS);
				lonColumn = guessColumn(preview.headers, LON_PATTERNS);
				void snapPreviewToAutoSelectedColumn(preview.headers, [latColumn, lonColumn]);
			})
			.catch((error) => {
				if (!cancelled)
					tableError = error instanceof Error ? error.message : '表の読み込みに失敗しました';
			})
			.finally(() => {
				if (!cancelled) loadingTable = false;
			});
		return () => {
			cancelled = true;
		};
	});

	const openDrawingGeoRef = async () => {
		if (!drawing?.featureCollection.features.length) return;
		isProcessing.set(true);
		try {
			const width = Math.max(1, drawingBounds[2] - drawingBounds[0]);
			const height = Math.max(1, drawingBounds[3] - drawingBounds[1]);
			const scale = 1024 / Math.max(width, height);
			const nextData = await featureCollectionToGeoRefData({
				featureCollection: drawing.featureCollection,
				entryName: `${entryName} - ${selectedSheet}`,
				width: Math.max(1, Math.round(width * scale)),
				height: Math.max(1, Math.round(height * scale))
			});
			const map = mapStore.getMap();
			geoRefData = {
				...nextData,
				vectorLineWidth: 1,
				vectorAttribution: 'Excel',
				allowedTransformModes: getAllowedTransformModesForIssue('xlsx', 'placement-missing'),
				initialCorners: map
					? getDefaultGeoRefCorners(map, nextData.imageWidth, nextData.imageHeight)
					: nextData.initialCorners
			};
			pendingZoneGeoRefData = null;
			focusBbox = null;
			transformOptionMode = 'georef';
			showDialogType = null;
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : '図面の位置合わせを開始できませんでした',
				'error'
			);
		} finally {
			isProcessing.set(false);
		}
	};

	const processFile = () => {
		if (!canSubmit) return;
		if (readMode === 'drawing') {
			void openDrawingGeoRef();
			return;
		}
		if (!sourceFile || !latColumn || !lonColumn) return;

		isProcessing.set(true);
		xlsxFileToGeojson(sourceFile, latColumn, lonColumn, selectedSheet || undefined)
			.then(async (geojson) => {
				rawGeojson = geojson;
				const bbox = turfBbox(geojson);

				if (!bbox || !isBboxValid(bbox)) {
					pendingZoneGeoRefData = {
						featureCollection: geojson,
						entryName
					};
					transformOptionMode = 'zone';
					focusBbox = bbox as [number, number, number, number];
					return;
				}

				const entry = await createGeoJsonEntry(
					geojson,
					'Point',
					entryName,
					bbox as [number, number, number, number],
					undefined,
					{ attribution: 'Excel' }
				);

				if (entry) {
					showDataEntry = entry;
					dropFile = null;
					showDialogType = null;
					showNotification('ファイルを読み込みました', 'success');
				} else {
					showNotification('データが不正です', 'error');
				}
			})
			.catch((error) => {
				showNotification(
					error instanceof Error ? error.message : 'Excelファイルの変換に失敗しました',
					'error'
				);
				console.error(error);
			})
			.finally(() => {
				isProcessing.set(false);
			});
	};

	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!rawGeojson) return;

		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const transformedGeojson = (await transformGeoJSONParallel(
				rawGeojson,
				prjContent
			)) as FeatureCollection;

			if (!transformedGeojson || transformedGeojson.features.length === 0) {
				showNotification('Excelファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(transformedGeojson);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entry = await createGeoJsonEntry(
				transformedGeojson,
				'Point',
				entryName,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: 'Excel' }
			);

			if (entry) {
				showDataEntry = entry;
				dropFile = null;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (error) {
			showNotification('Excelファイルの変換中にエラーが発生しました', 'error');
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
		if (zoneConfirmedEpsg && showDialogType === 'xlsx') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">Excelファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	{#if sheetNames.length > 1}
		<div class="flex w-full flex-col gap-1 p-2">
			<label for="sheet-select" class="text-sm text-gray-300">シート</label>
			<select
				id="sheet-select"
				bind:value={selectedSheet}
				class="bg-sub rounded border border-gray-600 p-2 text-white"
			>
				{#each sheetNames as sheetName (sheetName)}
					<option value={sheetName}>{sheetName}</option>
				{/each}
			</select>
		</div>
	{/if}

	{#if loading}
		<p class="text-sm text-gray-300">Excelを読み込み中...</p>
	{/if}
	{#if loadError || tableError}
		<p role="alert" class="text-sm text-amber-300">{loadError || tableError}</p>
	{/if}
	{#if drawing?.shapeCount}
		<div class="flex w-full flex-col gap-1 p-2">
			<label for="xlsx-read-mode" class="text-sm text-gray-300">読み込む内容</label>
			<select
				id="xlsx-read-mode"
				bind:value={readMode}
				class="bg-sub rounded border border-gray-600 p-2 text-white"
			>
				<option value="drawing">オートシェイプの図面</option>
				<option value="table">セルの表（座標列を指定）</option>
			</select>
		</div>
	{/if}
	{#if drawing?.skippedShapeCount}
		<p class="text-sm text-amber-300">
			未対応の図形 {drawing.skippedShapeCount} 個は読み込めませんでした。
		</p>
	{/if}
	{#if readMode === 'drawing' && drawing?.shapeCount}
		<div class="flex w-full min-w-0 flex-col gap-3 p-2">
			<p class="text-sm whitespace-normal text-gray-300">
				{drawing.shapeCount} 個の図形を線として読み込みます。次の画面で地図上の位置を合わせてください。
			</p>
			<svg
				viewBox={drawingViewBox}
				role="img"
				aria-label="Excel図面のプレビュー"
				class="h-72 w-full rounded bg-white p-3"
			>
				<g transform="scale(1,-1)" fill="none" stroke="#2563eb" stroke-width="1">
					{#each drawing.featureCollection.features as feature, index (index)}
						<polyline
							points={(feature.geometry.coordinates as number[][])
								.map((point) => point.join(','))
								.join(' ')}
							vector-effect="non-scaling-stroke"
						/>
					{/each}
				</g>
			</svg>
			<p class="text-xs whitespace-normal text-gray-400">
				塗り・線色・文字の見た目は再現しません。図形内の文字は属性に保存します。埋め込み画像は対象外です。
			</p>
		</div>
	{:else if !loading && !headers.length && !loadError && !tableError}
		<p class="text-sm text-gray-400">このシートに読み込める表がありません。</p>
	{/if}
	{#if readMode === 'table' && headers.length > 0}
		<div class="flex w-full flex-col gap-4 p-2">
			{#if previewRows.length > 0}
				<div
					bind:this={previewTableContainer}
					class="w-full overflow-x-auto rounded border border-gray-700"
				>
					<table class="w-full text-left text-xs">
						<thead class="bg-sub text-gray-300">
							<tr>
								{#each headers as header, headerIndex (header)}
									<th
										data-preview-column-index={headerIndex}
										class="px-3 py-1.5 font-medium whitespace-nowrap {header === latColumn ||
										header === lonColumn
											? 'bg-blue-900/40 text-blue-300'
											: ''}"
									>
										{header}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody class="text-gray-400">
							{#each previewRows as row, rowIndex (`${rowIndex}`)}
								<tr class="border-t border-gray-700/50">
									{#each headers as header (header)}
										<td
											class="px-3 py-1 whitespace-nowrap {header === latColumn ||
											header === lonColumn
												? 'bg-blue-900/20 text-blue-200'
												: ''}"
										>
											{row[header] ?? ''}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<div class="flex flex-col gap-1">
				<label for="lat-select" class="text-sm text-gray-300">緯度カラム</label>
				<select
					id="lat-select"
					bind:value={latColumn}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				>
					<option value="" disabled>選択してください</option>
					{#each headers as header (header)}
						<option value={header}>{header}</option>
					{/each}
				</select>
			</div>

			<div class="flex flex-col gap-1">
				<label for="lon-select" class="text-sm text-gray-300">経度カラム</label>
				<select
					id="lon-select"
					bind:value={lonColumn}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				>
					<option value="" disabled>選択してください</option>
					{#each headers as header (header)}
						<option value={header}>{header}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={processFile}
		disabled={!canSubmit}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {!canSubmit
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		{readMode === 'drawing' ? '位置合わせへ' : '決定'}
	</button>
</div>
