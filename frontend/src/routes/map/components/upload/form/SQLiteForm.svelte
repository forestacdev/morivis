<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { flushSync, onDestroy, untrack } from 'svelte';

	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import {
		createGeoJsonEntry,
		filterByGeometryType,
		getGeometryTypes
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import type { TabularRow } from '$routes/map/utils/formats/tabular';
	import { tabularRowsToGeojson } from '$routes/map/utils/formats/tabular';
	import {
		closeSqlite,
		getSqlitePreview,
		getSqliteTableGeoJson,
		getSqliteTableRows,
		openSqlite,
		type SqliteTableInfo
	} from '$routes/map/utils/formats/sqlite';
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
		selectedEpsgCode: _selectedEpsgCode,
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable()
	}: Props = $props();

	const LAT_PATTERNS = ['lat', 'latitude', '緯度', 'y'];
	const LON_PATTERNS = ['lon', 'lng', 'longitude', '経度', 'x'];
	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};

	let headers = $state<string[]>([]);
	let previewRows = $state<TabularRow[]>([]);
	let tables = $state<SqliteTableInfo[]>([]);
	let selectedTable = $state('');
	let loadedFileKey = $state('');
	let selectedGeometryColumn = $state('');
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let geometryTypeOptions = $state<{ key: VectorEntryGeometryType; name: string }[]>([]);
	let latColumn = $state('');
	let lonColumn = $state('');
	let rawGeojson = $state<FeatureCollection | null>(null);
	let previewTableContainer = $state<HTMLDivElement | null>(null);

	const sourceFile = $derived.by(() => {
		if (!dropFile) return null;
		return getFirstUploadFile(dropFile);
	});

	const entryName = $derived(sourceFile?.name.replace(/\.[^.]+$/, '') ?? 'SQLiteデータ');
	const selectedTableInfo = $derived.by(
		() => tables.find((table) => table.name === selectedTable) ?? null
	);
	const geometryColumns = $derived.by(() => selectedTableInfo?.geometryColumns ?? []);
	const isGeometryTable = $derived(geometryColumns.length > 0);
	const selectedEntryGeometryType = $derived(
		(selectedGeometryType || 'Point') as VectorEntryGeometryType
	);
	const confirmDisabled = $derived(
		$isProcessing
			|| !selectedTable
			|| (isGeometryTable ? !selectedGeometryColumn : !latColumn || !lonColumn)
	);

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

	const mapGeometryTypeCodeToEntryType = (
		geometryType: number | null | undefined
	): VectorEntryGeometryType | null => {
		if (geometryType === 1 || geometryType === 4) return 'Point';
		if (geometryType === 2 || geometryType === 5) return 'LineString';
		if (geometryType === 3 || geometryType === 6) return 'Polygon';
		return null;
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

	const resetState = () => {
		headers = [];
		previewRows = [];
		tables = [];
		selectedTable = '';
		selectedGeometryColumn = '';
		selectedGeometryType = '';
		geometryTypeOptions = [];
		latColumn = '';
		lonColumn = '';
		rawGeojson = null;
	};

	const applyPreview = async (tableName?: string) => {
		const preview = await getSqlitePreview(tableName);
		const guessedLatColumn = guessColumn(preview.headers, LAT_PATTERNS);
		const guessedLonColumn = guessColumn(preview.headers, LON_PATTERNS);
		const nextTableInfo =
			preview.tables.find((table) => table.name === preview.activeTable) ?? null;
		const nextGeometryColumns = nextTableInfo?.geometryColumns ?? [];
		const nextSelectedGeometryColumn = nextGeometryColumns.some(
			(column) => column.columnName === selectedGeometryColumn
		)
			? selectedGeometryColumn
			: (nextGeometryColumns[0]?.columnName ?? '');
		const inferredGeometryType = mapGeometryTypeCodeToEntryType(
			nextGeometryColumns.find((column) => column.columnName === nextSelectedGeometryColumn)
				?.geometryType
		);

		tables = preview.tables;
		selectedTable = preview.activeTable;
		headers = preview.headers;
		previewRows = preview.rows;
		selectedGeometryColumn = nextSelectedGeometryColumn;
		selectedGeometryType = inferredGeometryType ?? '';
		geometryTypeOptions = inferredGeometryType
			? [{ key: inferredGeometryType, name: GEOMETRY_TYPE_LABELS[inferredGeometryType] }]
			: [];
		latColumn = guessedLatColumn;
		lonColumn = guessedLonColumn;

		void snapPreviewToAutoSelectedColumn(
			preview.headers,
			nextSelectedGeometryColumn
				? [nextSelectedGeometryColumn]
				: [guessedLatColumn, guessedLonColumn]
		);

		return {
			tableInfo: nextTableInfo,
			selectedGeometryColumn: nextSelectedGeometryColumn
		};
	};

	const initializeSourceFile = async (file: File) => {
		isProcessing.set(true);

		try {
			closeSqlite();
			const buffer = new Uint8Array(await file.arrayBuffer());
			await openSqlite(buffer);
			const previewState = await applyPreview();

			if (tables.length === 0) {
				showNotification('読み込み可能なテーブルが見つかりませんでした', 'error');
				return;
			}

			if (
				previewState.tableInfo?.geometryColumns.length
				&& previewState.selectedGeometryColumn
			) {
				await processGeometryTable(
					previewState.tableInfo.name,
					previewState.selectedGeometryColumn,
					previewState.tableInfo.geometryColumns.find(
						(column) => column.columnName === previewState.selectedGeometryColumn
					)?.srid ?? null
				);
			}
		} catch (error) {
			showNotification('SQLiteファイルの読み込みに失敗しました', 'error');
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const loadSelectedTable = async (tableName: string) => {
		if (!tableName) return;
		isProcessing.set(true);

		try {
			const previewState = await applyPreview(tableName);
			if (
				previewState.tableInfo?.geometryColumns.length
				&& previewState.selectedGeometryColumn
			) {
				await processGeometryTable(
					previewState.tableInfo.name,
					previewState.selectedGeometryColumn,
					previewState.tableInfo.geometryColumns.find(
						(column) => column.columnName === previewState.selectedGeometryColumn
					)?.srid ?? null
				);
			}
		} catch (error) {
			showNotification('テーブルの読み込みに失敗しました', 'error');
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const resolveGeometrySelection = (
		geojson: FeatureCollection
	): { geojson: FeatureCollection; geometryType: VectorEntryGeometryType; } => {
		const types = getGeometryTypes(geojson);
		if (types.length === 0) {
			throw new Error('ジオメトリが見つかりませんでした');
		}

		geometryTypeOptions = types.map((type) => ({
			key: type,
			name: GEOMETRY_TYPE_LABELS[type] ?? type
		}));

		const geometryType =
			selectedGeometryType && types.includes(selectedGeometryType)
				? selectedGeometryType
				: types[0];
		selectedGeometryType = geometryType;

		if (types.length === 1) {
			return {
				geojson,
				geometryType
			};
		}

		return {
			geojson: filterByGeometryType(geojson, geometryType),
			geometryType
		};
	};

	const createEntryFromGeojson = async (
		geojson: FeatureCollection,
		geometryType: VectorEntryGeometryType
	) => {
		const bbox = turfBbox(geojson);
		if (!bbox || !isBboxValid(bbox)) {
			return { entry: null, bbox };
		}

		const entry = await createGeoJsonEntry(
			geojson,
			geometryType,
			entryName,
			bbox as [number, number, number, number],
			undefined,
			{ attribution: 'SQLite' }
		);

		return { entry, bbox };
	};

	const processGeometryTable = async (
		tableName: string,
		geometryColumn: string,
		srid: number | null
	) => {
		const result = await getSqliteTableGeoJson(tableName, geometryColumn);
		const selected = resolveGeometrySelection(result.geojson);
		rawGeojson = selected.geojson;

		let workingGeojson = selected.geojson;
		if (srid && srid !== 4326) {
			try {
				const prjContent = getProjContext(String(srid) as EpsgCode);
				workingGeojson = (await transformGeoJSONParallel(
					workingGeojson,
					prjContent
				)) as FeatureCollection;
			} catch {
				workingGeojson = selected.geojson;
			}
		}

		const { entry, bbox } = await createEntryFromGeojson(workingGeojson, selected.geometryType);
		if (!entry) {
			pendingZoneGeoRefData = {
				featureCollection: selected.geojson,
				entryName
			};
			transformOptionMode = 'zone';
			focusBbox = bbox as [number, number, number, number];
			return;
		}

		showDataEntry = entry;
		showDialogType = null;
		showNotification('ファイルを読み込みました', 'success');
	};

	$effect(() => {
		const nextFile = sourceFile;
		const currentFileKey = sourceFile
			? `${sourceFile.name}:${sourceFile.size}:${sourceFile.lastModified}`
			: '';
		if (!nextFile || !currentFileKey || currentFileKey === loadedFileKey) return;

		loadedFileKey = currentFileKey;
		resetState();
		void initializeSourceFile(nextFile);
	});

	const processFile = async () => {
		if (!selectedTable) return;
		if (!isGeometryTable && (!latColumn || !lonColumn)) return;
		if (isGeometryTable && !selectedGeometryColumn) return;

		isProcessing.set(true);

		try {
			if (isGeometryTable) {
				await processGeometryTable(
					selectedTable,
					selectedGeometryColumn,
					selectedTableInfo?.geometryColumns.find(
						(column) => column.columnName === selectedGeometryColumn
					)?.srid ?? null
				);
				return;
			}

			const tableRows = await getSqliteTableRows(selectedTable);
			const geojson = tabularRowsToGeojson(
				tableRows.headers,
				tableRows.rows,
				latColumn,
				lonColumn,
				'SQLite'
			);
			rawGeojson = geojson;
			selectedGeometryType = 'Point';
			geometryTypeOptions = [{ key: 'Point', name: GEOMETRY_TYPE_LABELS.Point }];

			const { entry, bbox } = await createEntryFromGeojson(geojson, 'Point');
			if (!entry) {
				pendingZoneGeoRefData = {
					featureCollection: geojson,
					entryName
				};
				transformOptionMode = 'zone';
				focusBbox = bbox as [number, number, number, number];
				return;
			}

			showDataEntry = entry;
			showDialogType = null;
			showNotification('ファイルを読み込みました', 'success');
		} catch (error) {
			showNotification('SQLiteテーブルの読み込みに失敗しました', 'error');
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
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
				showNotification('SQLiteファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(transformedGeojson);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entry = await createGeoJsonEntry(
				transformedGeojson,
				selectedEntryGeometryType,
				entryName,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: 'SQLite' }
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (error) {
			showNotification('SQLiteファイルの変換中にエラーが発生しました', 'error');
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		closeSqlite();
		dropFile = null;
		showDialogType = null;
	};

	onDestroy(() => {
		closeSqlite();
	});

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'sqlite') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				void convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">SQLiteファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	{#if tables.length > 1}
		<div class="flex w-full flex-col gap-1 p-2">
			<label for="sqlite-table-select" class="text-sm text-gray-300">テーブル</label>
			<select
				id="sqlite-table-select"
				bind:value={selectedTable}
				class="bg-sub rounded border border-gray-600 p-2 text-white"
				onchange={() => {
					void loadSelectedTable(selectedTable);
				}}
			>
				{#each tables as table (table.name)}
					<option value={table.name}>
						{table.name}
						({table.rowCount ?? '?'}件 / {table.columns.length}列)
					</option>
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
										header === lonColumn ||
										header === selectedGeometryColumn
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
											header === lonColumn ||
											header === selectedGeometryColumn
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

			{#if isGeometryTable}
				<div class="flex flex-col gap-1">
					<label for="geometry-column-select" class="text-sm text-gray-300"
						>ジオメトリカラム</label
					>
					<select
						id="geometry-column-select"
						bind:value={selectedGeometryColumn}
						class="bg-sub rounded border border-gray-600 p-2 text-white"
						onchange={() => {
							const inferredGeometryType = mapGeometryTypeCodeToEntryType(
								geometryColumns.find((column) => column.columnName === selectedGeometryColumn)
									?.geometryType
							);
							selectedGeometryType = inferredGeometryType ?? '';
							geometryTypeOptions = inferredGeometryType
								? [{ key: inferredGeometryType, name: GEOMETRY_TYPE_LABELS[inferredGeometryType] }]
								: [];
						}}
					>
						{#each geometryColumns as column (column.columnName)}
							<option value={column.columnName}>
								{column.columnName}
								{#if column.geometryFormat}
									[{column.geometryFormat}]{/if}
								{#if column.srid}
									(EPSG:{column.srid}){/if}
							</option>
						{/each}
					</select>
				</div>

				{#if geometryTypeOptions.length > 1}
					<div class="flex flex-col gap-1">
						<label for="geometry-type-select" class="text-sm text-gray-300"
							>ジオメトリタイプ</label
						>
						<select
							id="geometry-type-select"
							bind:value={selectedGeometryType}
							class="bg-sub rounded border border-gray-600 p-2 text-white"
						>
							{#each geometryTypeOptions as option (option.key)}
								<option value={option.key}>{option.name}</option>
							{/each}
						</select>
					</div>
				{/if}
			{:else}
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
			{/if}
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={processFile}
		disabled={confirmDisabled}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {confirmDisabled
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
