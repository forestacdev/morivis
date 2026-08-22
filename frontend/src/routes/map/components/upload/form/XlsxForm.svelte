<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { flushSync, untrack } from 'svelte';

	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import type { TabularRow } from '$routes/map/utils/formats/tabular';
	import { getXlsxPreview, xlsxFileToGeojson } from '$routes/map/utils/formats/xlsx';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
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

	let headers = $state<string[]>([]);
	let previewRows = $state<TabularRow[]>([]);
	let sheetNames = $state<string[]>([]);
	let selectedSheet = $state<string>('');
	let loadedFileName = $state<string>('');
	let latColumn = $state<string>('');
	let lonColumn = $state<string>('');
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
		const currentFileName = sourceFile?.name ?? '';
		if (currentFileName && currentFileName !== loadedFileName) {
			loadedFileName = currentFileName;
			selectedSheet = '';
			sheetNames = [];
			headers = [];
			previewRows = [];
			latColumn = '';
			lonColumn = '';
			rawGeojson = null;
		}
	});

	$effect(() => {
		if (!sourceFile) return;

		isProcessing.set(true);
		getXlsxPreview(sourceFile, selectedSheet || undefined)
			.then((preview) => {
				const guessedLatColumn = guessColumn(preview.headers, LAT_PATTERNS);
				const guessedLonColumn = guessColumn(preview.headers, LON_PATTERNS);

				headers = preview.headers;
				previewRows = preview.rows;
				sheetNames = preview.sheetNames;
				latColumn = guessedLatColumn;
				lonColumn = guessedLonColumn;
				void snapPreviewToAutoSelectedColumn(preview.headers, [guessedLatColumn, guessedLonColumn]);

				if (selectedSheet !== preview.activeSheet) {
					selectedSheet = preview.activeSheet;
				}
			})
			.catch((error) => {
				showNotification('Excelファイルの読み込みに失敗しました', 'error');
				console.error(error);
			})
			.finally(() => {
				isProcessing.set(false);
			});
	});

	const processFile = () => {
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

	{#if headers.length > 0}
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
		disabled={$isProcessing || !latColumn || !lonColumn}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!latColumn ||
		!lonColumn
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
