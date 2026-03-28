<script lang="ts">
	import { slide } from 'svelte/transition';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import {
		WEB_MERCATOR_MIN_LAT,
		WEB_MERCATOR_MAX_LAT,
		WEB_MERCATOR_MIN_LNG,
		WEB_MERCATOR_MAX_LNG
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';
	import {
		GeoTiffCache,
		encodeAllBandsToTerrarium,
		getMinMax,
		type BandDataRange,
		type RasterBands
	} from '$routes/map/utils/file/geotiff';
	import { PureGrib2Parser } from '$routes/map/utils/file/grib2';
	import { generateThumbnail } from '$routes/map/utils/file/thumbnail';
	import { findCenterTile, isBboxValid } from '$routes/map/utils/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	interface GribMessage {
		index: number;
		label: string;
		nx: number;
		ny: number;
		la1: number;
		lo1: number;
		la2: number;
		lo2: number;
		values: Float32Array;
	}

	const MAX_BANDS = 10;

	let entryName = $state('');
	let analyzed = $state(false);
	let messages = $state<GribMessage[]>([]);
	let selectedIndices = $state<number[]>([]);

	const gribFile = $derived.by(() => {
		if (!dropFile) return null;
		if (dropFile instanceof FileList) {
			return Array.from(dropFile).find((f) => /\.(bin|grib2|grb2|grb)$/i.test(f.name)) ?? null;
		}
		return dropFile;
	});

	$effect(() => {
		if (gribFile) {
			entryName = gribFile.name.replace(/\.[^.]+$/, '');
			analyzeGrib2(gribFile);
		}
	});

	const analyzeGrib2 = async (file: File) => {
		isProcessing.set(true);
		analyzed = false;
		messages = [];
		selectedIndices = [];

		try {
			const arrayBuffer = await file.arrayBuffer();
			const parser = new PureGrib2Parser(arrayBuffer);
			const records = parser.parse();

			messages = records.map((record, i) => {
				const meta = record.metadata;
				const paramName = meta.parameterName ?? `Param ${meta.parameterNumber}`;
				return {
					index: i,
					label: `${paramName} (${meta.nx}x${meta.ny}) Level:${meta.levelType}=${meta.levelValue}`,
					nx: meta.nx,
					ny: meta.ny,
					la1: meta.la1,
					lo1: meta.lo1,
					la2: meta.la2,
					lo2: meta.lo2,
					values: record.values
				};
			});

			analyzed = true;

			if (messages.length === 1) {
				selectedIndices = [0];
			}

			showNotification(`GRIB2: ${messages.length}メッセージを検出`, 'success');
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'GRIB2の解析に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const registration = async () => {
		if (!analyzed || selectedIndices.length === 0) return;

		isProcessing.set(true);

		try {
			const selectedMessages = selectedIndices.map((i) => messages[i]);
			const firstMsg = selectedMessages[0];
			const { nx, ny, la1, lo1, la2, lo2 } = firstMsg;
			const numBands = selectedMessages.length;

			const id = `geotiff_${crypto.randomUUID()}`;

			const bands: RasterBands = selectedMessages.map((m) => m.values);
			const ranges: BandDataRange[] = bands.map((band) => getMinMax(band, null));

			// bbox
			const minLat = Math.min(la1, la2);
			const maxLat = Math.max(la1, la2);
			const minLon = Math.min(lo1, lo2);
			const maxLon = Math.max(lo1, lo2);
			const rawBbox: [number, number, number, number] =
				minLat === maxLat && minLon === maxLon
					? [120, 20, 150, 50]
					: [minLon, minLat, maxLon, maxLat];

			// サムネイル（最初のバンドから）
			let mapImage: string | undefined;
			if (rawBbox[0] !== rawBbox[2] && rawBbox[1] !== rawBbox[3]) {
				try {
					mapImage = generateThumbnail({
						bands: [firstMsg.values],
						width: nx,
						height: ny,
						bbox: rawBbox,
						ranges
					});
				} catch {
					/* ignore */
				}
			}

			await encodeAllBandsToTerrarium(id, bands, nx, ny, null, ranges);

			GeoTiffCache.setSize(id, nx, ny);
			GeoTiffCache.setNumBands(id, numBands);

			const resolvedBbox: [number, number, number, number] = [
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, rawBbox[0])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, rawBbox[1])),
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, rawBbox[2])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, rawBbox[3]))
			];

			GeoTiffCache.setBbox(id, resolvedBbox);
			GeoTiffCache.markAs4326(id);
			GeoTiffCache.setRawBbox(id, rawBbox);

			const isSingleBand = numBands === 1;

			const entry: RasterImageEntry<RasterTiffStyle> = {
				id,
				type: 'raster',
				format: { type: 'image', url: '' },
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					name: entryName || 'GPVデータ',
					tileSize: 256,
					bounds: resolvedBbox,
					xyzImageTile: findCenterTile(resolvedBbox),
					mapImage
				},
				interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
				style: {
					type: 'tiff',
					opacity: 1.0,
					visible: true,
					visualization: {
						numBands,
						mode: isSingleBand ? 'single' : 'multi',
						uniformsData: {
							single: {
								index: 0,
								min: ranges[0].min,
								max: ranges[0].max,
								colorMap: 'jet'
							},
							multi: {
								r: { index: 0, min: ranges[0].min, max: ranges[0].max },
								g: {
									index: numBands >= 2 ? 1 : 0,
									min: ranges[numBands >= 2 ? 1 : 0].min,
									max: ranges[numBands >= 2 ? 1 : 0].max
								},
								b: {
									index: numBands >= 3 ? 2 : 0,
									min: ranges[numBands >= 3 ? 2 : 0].min,
									max: ranges[numBands >= 3 ? 2 : 0].max
								}
							}
						}
					}
				}
			};

			showDataEntry = entry;
			showDialogType = null;
			dropFile = null;
			const labels = selectedMessages.map((m) => m.label).join(', ');
			showNotification(`GPV ${numBands}バンドを読み込みました`, 'success');
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'エンコードに失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		showDialogType = null;
		dropFile = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">GRIB2 (GPV) の登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={entryName} label="データ名" />

	{#if gribFile}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {gribFile.name}
		</div>
	{/if}

	{#if messages.length > 0}
		<div transition:slide class="w-full">
			<div class="flex flex-col gap-1">
				<span class="text-sm text-gray-300">
					メッセージを選択 ({selectedIndices.length}/{messages.length}件, 最大{MAX_BANDS}バンド)
				</span>
				<div class="bg-sub max-h-48 overflow-y-auto rounded border border-gray-600">
					{#each messages as msg}
						<label
							class="flex cursor-pointer items-center gap-2 px-2 py-1 text-sm text-white hover:bg-gray-700
								{selectedIndices.includes(msg.index) ? 'bg-gray-700' : ''}"
						>
							<input
								type="checkbox"
								checked={selectedIndices.includes(msg.index)}
								disabled={!selectedIndices.includes(msg.index) &&
									selectedIndices.length >= MAX_BANDS}
								onchange={() => {
									if (selectedIndices.includes(msg.index)) {
										selectedIndices = selectedIndices.filter((i) => i !== msg.index);
									} else if (selectedIndices.length < MAX_BANDS) {
										selectedIndices = [...selectedIndices, msg.index].sort((a, b) => a - b);
									}
								}}
								class="accent-accent"
							/>
							<span class="truncate">
								{msg.index + 1}. {msg.label}
							</span>
						</label>
					{/each}
				</div>
			</div>
		</div>

		{#if selectedIndices.length > 0}
			{@const firstMsg = messages[selectedIndices[0]]}
			<div transition:slide class="flex w-full flex-col gap-1 px-2 text-sm text-gray-300">
				<div>グリッド: {firstMsg.nx} x {firstMsg.ny}</div>
				<div>
					緯度: {Math.min(firstMsg.la1, firstMsg.la2).toFixed(2)} 〜 {Math.max(
						firstMsg.la1,
						firstMsg.la2
					).toFixed(2)}
				</div>
				<div>
					経度: {Math.min(firstMsg.lo1, firstMsg.lo2).toFixed(2)} 〜 {Math.max(
						firstMsg.lo1,
						firstMsg.lo2
					).toFixed(2)}
				</div>
				<div>選択バンド数: {selectedIndices.length}</div>
			</div>
		{/if}
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={registration}
		disabled={!analyzed || selectedIndices.length === 0 || $isProcessing}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {!analyzed ||
		selectedIndices.length === 0 ||
		$isProcessing
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>
