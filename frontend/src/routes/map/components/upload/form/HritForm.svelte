<script lang="ts">
	import { slide } from 'svelte/transition';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';
	import { GeoTiffCache, type BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
	import {
		encodeAllBandsToTerrarium,
		getMinMax,
		type RasterBands
	} from '$routes/map/utils/formats/geotiff';
	import {
		parseHritRaster,
		parseHritRasterFiles,
		type HritMetadata
	} from '$routes/map/utils/formats/hrit';
	import { generateThumbnail } from '$routes/map/utils/formats/raster/thumbnail';
	import { findCenterTile } from '$routes/map/utils/map/tile';
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

	let entryName = $state('');
	let metadata = $state<HritMetadata | null>(null);
	let preview = $state<Awaited<ReturnType<typeof parseHritRaster>> | null>(null);

	const hritFile = $derived.by(() => {
		if (!dropFile) return null;
		if (dropFile instanceof FileList) {
			return Array.from(dropFile);
		}
		return dropFile;
	});

	$effect(() => {
		if (hritFile) {
			if (Array.isArray(hritFile)) {
				entryName =
					hritFile[0]?.name.replace(/\.(bz2|lrit|hrit)$/i, '').replace(/_\d{3}$/, '') ?? '';
			} else {
				entryName = hritFile.name.replace(/\.(bz2|lrit|hrit)$/i, '');
			}
			analyzeHrit(hritFile);
		}
	});

	const mjdToJstLabel = (mjd: number) => {
		if (!Number.isFinite(mjd)) return '';
		const utcMs = (mjd - 40587) * 86400000;
		const jst = new Date(utcMs + 9 * 60 * 60 * 1000);
		const pad = (value: number) => value.toString().padStart(2, '0');

		return `${jst.getUTCFullYear()}/${pad(jst.getUTCMonth() + 1)}/${pad(jst.getUTCDate())} ${pad(
			jst.getUTCHours()
		)}:${pad(jst.getUTCMinutes())}`;
	};

	const analyzeHrit = async (file: File | File[]) => {
		isProcessing.set(true);
		metadata = null;
		preview = null;

		try {
			const parsed = Array.isArray(file)
				? await parseHritRasterFiles(file)
				: await parseHritRaster(file);
			metadata = parsed.metadata;
			preview = parsed;
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'HRITファイルの解析に失敗しました',
				'error'
			);
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const registration = async () => {
		if (!preview || !metadata) return;

		isProcessing.set(true);

		try {
			const id = `geotiff_${crypto.randomUUID()}`;
			const bands: RasterBands = [preview.data];
			const ranges: BandDataRange[] = [getMinMax(preview.data, preview.nodata)];
			const mapImage = generateThumbnail({
				bands,
				width: preview.width,
				height: preview.height,
				bbox: preview.bbox,
				nodata: preview.nodata,
				ranges
			});

			await encodeAllBandsToTerrarium(
				id,
				bands,
				preview.width,
				preview.height,
				preview.nodata,
				ranges
			);

			GeoTiffCache.setSize(id, preview.width, preview.height);
			GeoTiffCache.setNumBands(id, 1);
			GeoTiffCache.setBbox(id, preview.bbox);
			GeoTiffCache.markAs4326(id);
			GeoTiffCache.setRawBbox(id, preview.bbox);

			const segmentSuffix =
				metadata.totalImageSegments > 1
					? ` セグメント${metadata.imageSegmentSequence}/${metadata.totalImageSegments}`
					: '';
			const entry: RasterImageEntry<RasterTiffStyle> = {
				id,
				type: 'raster',
				format: { type: 'image', url: '' },
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					attribution: 'JMA HRIT',
					name: entryName || metadata.annotation,
					description: `${metadata.channelName} の気象衛星画像です。静止気象衛星の観測値を背景ラスターとして表示するときに利用できます。`,
					tileSize: 256,
					bounds: preview.bbox,
					xyzImageTile: findCenterTile(preview.bbox),
					mapImage
				},
				properties: {
					bands: {
						numBands: 1
					}
				},
				interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
				style: {
					type: 'tiff',
					opacity: 1.0,
					visible: true,
					visualization: {
						mode: 'single',
						uniformsData: {
							single: {
								index: 0,
								min: ranges[0].min,
								max: ranges[0].max,
								colorMap: 'jet'
							},
							multi: {
								r: { index: 0, min: ranges[0].min, max: ranges[0].max },
								g: { index: 0, min: ranges[0].min, max: ranges[0].max },
								b: { index: 0, min: ranges[0].min, max: ranges[0].max }
							}
						}
					}
				}
			};

			showDataEntry = entry;
			showDialogType = null;
			dropFile = null;
			showNotification(
				`${metadata.channelName}${segmentSuffix} を ${preview.width}x${preview.height} で読み込みました`,
				'success'
			);
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'HRITラスターの登録に失敗しました',
				'error'
			);
			console.error(error);
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
	<span class="text-2xl font-bold">HRIT/LRIT の登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={entryName} label="データ名" />

	{#if hritFile}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {Array.isArray(hritFile) ? `${hritFile.length}ファイル` : hritFile.name}
		</div>
	{/if}

	{#if metadata && preview}
		<div transition:slide class="flex w-full flex-col gap-1 px-2 text-sm text-gray-300">
			<div>チャンネル: {metadata.channelName}</div>
			<div>単位: {metadata.unit || '未設定'}</div>
			<div>
				元画像サイズ: {metadata.columns} x {metadata.lines} / 再投影後: {preview.width} x {preview.height}
			</div>
			<div>
				セグメント: {metadata.imageSegmentSequence} / {metadata.totalImageSegments} (開始ライン {metadata.firstLineNumber})
			</div>
			<div>
				範囲: 緯度 {preview.bbox[1].toFixed(2)} 〜 {preview.bbox[3].toFixed(2)} / 経度 {preview.bbox[0].toFixed(
					2
				)} 〜 {preview.bbox[2].toFixed(2)}
			</div>
			{#if metadata.observationTimes.length > 0}
				<div>
					観測時刻: {mjdToJstLabel(metadata.observationTimes[0].timeMjd)}
					{#if metadata.observationTimes.length > 1}
						〜 {mjdToJstLabel(
							metadata.observationTimes[metadata.observationTimes.length - 1].timeMjd
						)}
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={registration}
		disabled={!preview || $isProcessing}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {!preview || $isProcessing
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>
