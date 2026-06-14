<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import {
		readDelimitedTextAsUtf8,
		getDelimitedTextPreview,
		delimitedTextToGeojson,
		type CSVPreview
	} from '$routes/map/utils/formats/csv';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		transformOptionMode: TransformOptionMode;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		pendingZoneGeoRefData: PendingZoneGeoRefData | null;
		formatName: string;
		dialogTypeValue: Exclude<DialogType, null>;
		delimiter: string;
		attribution: string;
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
		formatName,
		dialogTypeValue,
		delimiter,
		attribution
	}: Props = $props();

	let headers = $state<string[]>([]);
	let previewRows = $state<Record<string, string | number>[]>([]);
	let latColumn = $state<string>('');
	let lonColumn = $state<string>('');
	let fileText = $state<string>('');
	let rawGeojson: FeatureCollection | null = null;

	const sourceFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(sourceFile?.name.replace(/\.[^.]+$/, '') ?? `${formatName}データ`);

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

	$effect(() => {
		if (sourceFile) {
			isProcessing.set(true);
			readDelimitedTextAsUtf8(sourceFile)
				.then((text) => {
					fileText = text;
					return getDelimitedTextPreview(text, 5, { delimiter });
				})
				.then((preview: CSVPreview) => {
					headers = preview.headers;
					previewRows = preview.rows;
					latColumn = guessColumn(preview.headers, LAT_PATTERNS);
					lonColumn = guessColumn(preview.headers, LON_PATTERNS);
				})
				.catch((error) => {
					showNotification(`${formatName}ファイルの読み込みに失敗しました`, 'error');
					console.error(error);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	const processFile = () => {
		if (!fileText || !latColumn || !lonColumn) return;
		isProcessing.set(true);

		delimitedTextToGeojson(fileText, latColumn, lonColumn, { delimiter })
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
					{ attribution }
				);

				if (entry) {
					showDataEntry = entry;
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
				showNotification(`${formatName}ファイルの変換に失敗しました`, 'error');
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
				{ attribution }
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (error) {
			showNotification(`${formatName}ファイルの変換中にエラーが発生しました`, 'error');
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
		if (zoneConfirmedEpsg && showDialogType === dialogTypeValue) {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">{formatName}ファイルの登録</span>
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
								{#each headers as header (header)}
									<th
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
