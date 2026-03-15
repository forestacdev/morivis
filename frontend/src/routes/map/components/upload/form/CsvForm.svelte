<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { readCsvAsUtf8, getCSVPreview, csvTextToGeojson, type CSVPreview } from '$routes/map/utils/file/csv';
	import { isBboxValid } from '$routes/map/utils/map';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		showZoneForm = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable()
	}: Props = $props();

	let headers = $state<string[]>([]);
	let previewRows = $state<Record<string, string | number>[]>([]);
	let latColumn = $state<string>('');
	let lonColumn = $state<string>('');
	let csvText = $state<string>('');
	let rawGeojson = $state<FeatureCollection | null>(null);

	const csvFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(csvFile?.name.replace(/\.[^.]+$/, '') ?? 'CSVデータ');

	// 緯度カラムの自動推定パターン
	const LAT_PATTERNS = ['lat', 'latitude', '緯度', 'y'];
	const LON_PATTERNS = ['lon', 'lng', 'longitude', '経度', 'x'];

	const guessColumn = (headers: string[], patterns: string[]): string => {
		for (const pattern of patterns) {
			const found = headers.find((h) => h.toLowerCase() === pattern);
			if (found) return found;
		}
		for (const pattern of patterns) {
			const found = headers.find((h) => h.toLowerCase().includes(pattern));
			if (found) return found;
		}
		return '';
	};

	// ファイルドロップ時: エンコード変換 → ヘッダー読み取り
	$effect(() => {
		if (csvFile) {
			isProcessing.set(true);
			readCsvAsUtf8(csvFile)
				.then((text) => {
					csvText = text;
					return getCSVPreview(text);
				})
				.then((preview) => {
					headers = preview.headers;
					previewRows = preview.rows;
					latColumn = guessColumn(preview.headers, LAT_PATTERNS);
					lonColumn = guessColumn(preview.headers, LON_PATTERNS);
				})
				.catch((e) => {
					showNotification('CSVファイルの読み込みに失敗しました', 'error');
					console.error(e);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	const processCSV = () => {
		if (!csvText || !latColumn || !lonColumn) return;
		isProcessing.set(true);

		csvTextToGeojson(csvText, latColumn, lonColumn)
			.then((geojson) => {
				rawGeojson = geojson;
				const bbox = turfBbox(geojson);

				if (!bbox || !isBboxValid(bbox)) {
					showZoneForm = true;
					focusBbox = bbox as [number, number, number, number];
					return;
				}

				const entry = createGeoJsonEntry(
					geojson,
					'Point',
					entryName,
					bbox as [number, number, number, number],
					'default'
				);

				if (entry) {
					showDataEntry = entry;
					showDialogType = null;
					showNotification('ファイルを読み込みました', 'success');
				} else {
					showNotification('データが不正です', 'error');
				}
			})
			.catch((e) => {
				console.error(e);
			})
			.finally(() => {
				isProcessing.set(false);
			});
	};

	// ZoneFormで座標系選択後 → 座標変換してエントリ作成
	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!rawGeojson) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const plainGeojson = JSON.parse(JSON.stringify(rawGeojson));

			const transformedGeojson = (await transformGeoJSONParallel(
				plainGeojson,
				prjContent
			)) as FeatureCollection;

			if (!transformedGeojson || transformedGeojson.features.length === 0) {
				showNotification('CSVファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(transformedGeojson);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entry = createGeoJsonEntry(
				transformedGeojson,
				'Point',
				entryName,
				bbox as [number, number, number, number],
				'default'
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (e) {
			showNotification('CSVファイルの変換中にエラーが発生しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		showDialogType = null;
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'csv') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">CSVファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	{#if headers.length > 0}
		<div class="flex w-full flex-col gap-4 p-2">
			{#if previewRows.length > 0}
				<div class="w-full overflow-x-auto rounded border border-gray-700">
					<table class="w-full text-left text-xs">
						<thead class="bg-sub text-gray-300">
							<tr>
								{#each headers as header}
									<th
										class="whitespace-nowrap px-3 py-1.5 font-medium {header === latColumn || header === lonColumn
											? 'bg-blue-900/40 text-blue-300'
											: ''}"
									>
										{header}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody class="text-gray-400">
							{#each previewRows as row}
								<tr class="border-t border-gray-700/50">
									{#each headers as header}
										<td
											class="whitespace-nowrap px-3 py-1 {header === latColumn || header === lonColumn
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
					{#each headers as header}
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
					{#each headers as header}
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
		onclick={processCSV}
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
