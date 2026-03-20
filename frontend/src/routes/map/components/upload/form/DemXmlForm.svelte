<script lang="ts">
	import { fade, slide } from 'svelte/transition';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import DropContainer from '$routes/map/components/DropContainer.svelte';
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
	import { parseDemXml, type DemXmlResult } from '$routes/map/utils/file/dem-xml';
	import {
		GeoTiffCache,
		encodeAllBandsToTerrarium,
		getMinMax,
		type BandDataRange,
		type RasterBands
	} from '$routes/map/utils/file/geotiff';
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

	let entryName = $state('');
	let analyzed = $state(false);
	let demResult = $state<DemXmlResult | null>(null);
	let seaAtZero = $state(true);
	let progressText = $state('');
	let fileCount = $state(0);
	let isDragover = $state(false);

	// 蓄積されたXMLファイル一覧
	let accumulatedFiles = $state<File[]>([]);

	// dropFileが変わるたびに蓄積に追加
	$effect(() => {
		if (!dropFile) return;
		const files = dropFile instanceof FileList ? Array.from(dropFile) : [dropFile];
		const xmlFiles = files.filter((f) => /\.xml$/i.test(f.name));
		const zipFile = files.find((f) => /\.zip$/i.test(f.name));

		if (zipFile) {
			// ZIPは蓄積せずそのまま
			accumulatedFiles = [zipFile];
		} else if (xmlFiles.length > 0) {
			// 既存ファイルに追加（重複排除）
			const existingNames = new Set(accumulatedFiles.map((f) => f.name));
			const newFiles = xmlFiles.filter((f) => !existingNames.has(f.name));
			if (newFiles.length > 0) {
				accumulatedFiles = [...accumulatedFiles, ...newFiles];
			}
		}
	});

	const inputFiles = $derived(accumulatedFiles.length > 0 ? accumulatedFiles : null);

	let initialAnalysisDone = $state(false);

	// 初回のみ自動解析
	$effect(() => {
		if (inputFiles && inputFiles.length > 0 && !initialAnalysisDone) {
			entryName = inputFiles[0].name.replace(/\.[^.]+$/, '');
			initialAnalysisDone = true;
			analyzeDemXml();
		}
	});

	// 追加ドロップ時のハンドラ
	const onDropFiles = (files: FileList) => {
		dropFile = files;
		analyzed = false;
		demResult = null;
	};

	const analyzeDemXml = async () => {
		if (!inputFiles) return;

		isProcessing.set(true);
		analyzed = false;
		demResult = null;
		progressText = '';

		try {
			const input = inputFiles.length === 1 ? inputFiles[0] : inputFiles;

			const result = await parseDemXml(input, seaAtZero, (current, total, fileName) => {
				progressText = `${current}/${total}: ${fileName}`;
				fileCount = total;
			});

			demResult = result;
			analyzed = true;
			progressText = '';

			showNotification(
				`DEM XML: ${result.width}x${result.height}px (${fileCount || 1}ファイル)`,
				'success'
			);
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'DEM XMLの解析に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	/**
	 * サムネイル生成
	 */
	const generateThumbnail = (dem: DemXmlResult): string => {
		const { data, width, height, bbox, nodata } = dem;

		// メルカトルのアスペクト比を計算
		const DEG2RAD = Math.PI / 180;
		const latToMercY = (lat: number) => Math.log(Math.tan(lat * DEG2RAD * 0.5 + Math.PI / 4));
		const mercYMin = latToMercY(bbox[1]);
		const mercYMax = latToMercY(bbox[3]);
		const lngRange = bbox[2] - bbox[0];
		const mercYRange = mercYMax - mercYMin;
		const mercAspect = mercYRange / (lngRange * DEG2RAD);

		// 512x512に収まるサイズをメルカトルアスペクト比で計算
		const thumbSize = 512;
		let thumbW: number, thumbH: number;
		if (mercAspect > 1) {
			thumbH = thumbSize;
			thumbW = Math.round(thumbSize / mercAspect);
		} else {
			thumbW = thumbSize;
			thumbH = Math.round(thumbSize * mercAspect);
		}

		const canvas = new OffscreenCanvas(thumbW, thumbH);
		const ctx = canvas.getContext('2d')!;
		const imgData = ctx.createImageData(thumbW, thumbH);
		const pixels = imgData.data;

		// min/maxを計算（nodata除外）
		let min = Infinity;
		let max = -Infinity;
		for (let i = 0; i < data.length; i++) {
			if (data[i] !== nodata && Number.isFinite(data[i])) {
				if (data[i] < min) min = data[i];
				if (data[i] > max) max = data[i];
			}
		}
		const invRange = max !== min ? 255 / (max - min) : 0;

		for (let ty = 0; ty < thumbH; ty++) {
			// サムネイルのY → メルカトルY → 緯度 → 元データのY
			const mercY = mercYMax - (ty / thumbH) * mercYRange;
			const lat = (2 * Math.atan(Math.exp(mercY)) - Math.PI / 2) / DEG2RAD;
			const srcY = Math.floor(((bbox[3] - lat) / (bbox[3] - bbox[1])) * height);

			for (let tx = 0; tx < thumbW; tx++) {
				const srcX = Math.floor((tx / thumbW) * width);
				const dstIdx = (ty * thumbW + tx) * 4;

				if (srcX < 0 || srcX >= width || srcY < 0 || srcY >= height) {
					pixels[dstIdx + 3] = 0;
					continue;
				}

				const val = data[srcY * width + srcX];
				if (val === nodata || !Number.isFinite(val)) {
					pixels[dstIdx + 3] = 0;
				} else {
					const normalized = Math.max(0, Math.min(255, (val - min) * invRange));
					pixels[dstIdx] = normalized;
					pixels[dstIdx + 1] = normalized;
					pixels[dstIdx + 2] = normalized;
					pixels[dstIdx + 3] = 255;
				}
			}
		}

		ctx.putImageData(imgData, 0, 0);
		const tempCanvas = document.createElement('canvas');
		tempCanvas.width = thumbW;
		tempCanvas.height = thumbH;
		const tempCtx = tempCanvas.getContext('2d')!;
		tempCtx.putImageData(imgData, 0, 0);
		return tempCanvas.toDataURL('image/png');
	};

	const registration = async () => {
		if (!analyzed || !demResult) return;

		isProcessing.set(true);

		try {
			const { data, width, height, bbox, nodata } = demResult;

			const id = `geotiff_${crypto.randomUUID()}`;

			const bands: RasterBands = [data];
			const ranges: BandDataRange[] = [getMinMax(data, nodata)];

			// サムネイル生成
			const mapImage = generateThumbnail(demResult);

			await encodeAllBandsToTerrarium(id, bands, width, height, nodata, ranges);

			GeoTiffCache.setSize(id, width, height);
			GeoTiffCache.setNumBands(id, 1);

			// WGS84 → WebMercatorクリップ + 4326再投影
			const resolvedBbox: [number, number, number, number] = [
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[0])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[1])),
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[2])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[3]))
			];

			GeoTiffCache.setBbox(id, resolvedBbox);
			GeoTiffCache.markAs4326(id);
			GeoTiffCache.setRawBbox(id, bbox);

			const entry: RasterImageEntry<RasterTiffStyle> = {
				id,
				type: 'raster',
				format: { type: 'image', url: '' },
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					name: entryName || '基盤地図DEM',
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
						numBands: 1,
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
			showNotification('基盤地図DEMを読み込みました', 'success');
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

<DropContainer bind:isDragover onDropFile={onDropFiles} class="flex h-full w-full flex-col">
	<div
		transition:fade={{ duration: 200 }}
		class="flex h-full w-full flex-col {isDragover ? 'opacity-50' : ''}"
	>
		<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
			<span class="text-2xl font-bold">基盤地図情報 DEM の登録</span>
		</div>

		<div
			class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
		>
			<TextForm bind:value={entryName} label="データ名" />

			{#if inputFiles}
				<div class="w-full px-2 text-sm text-gray-300">
					{#if inputFiles.length === 1}
						ファイル: {inputFiles[0].name}
					{:else}
						ファイル: {inputFiles.length}個のXML
					{/if}
				</div>
			{/if}

			{#if progressText}
				<div transition:slide class="w-full px-2 text-sm text-blue-300">
					{progressText}
				</div>
			{/if}

			{#if demResult}
				<div class="flex w-full flex-col gap-1 px-2 text-sm text-gray-300">
					<div>サイズ: {demResult.width} x {demResult.height} px</div>
					<div>
						範囲: [{demResult.bbox[0].toFixed(6)}, {demResult.bbox[1].toFixed(6)}, {demResult.bbox[2].toFixed(
							6
						)}, {demResult.bbox[3].toFixed(6)}]
					</div>
				</div>
			{/if}

			<div class="flex w-full items-center gap-2 px-2">
				<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
					<input type="checkbox" bind:checked={seaAtZero} class="accent-accent" />
					海面を0mとして扱う
				</label>
			</div>

			{#if !inputFiles && !$isProcessing}
				<div class="flex w-full flex-col items-center gap-2 p-4 text-center text-sm text-gray-400">
					<p>基盤地図情報のDEM XMLファイル（.xml）または</p>
					<p>XMLを含むZIPファイル（.zip）をドロップしてください</p>
					<p class="text-xs text-gray-500">追加ドロップでファイルを増やせます</p>
				</div>
			{:else if inputFiles && !$isProcessing && !analyzed}
				<div class="w-full px-2 text-center text-xs text-gray-500">
					追加のXMLファイルをドロップできます
				</div>
			{/if}
		</div>

		<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
			<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>

			{#if analyzed}
				<button
					onclick={registration}
					disabled={$isProcessing}
					class="c-btn-confirm min-w-[200px] p-4 text-lg {$isProcessing
						? 'cursor-not-allowed opacity-50'
						: 'cursor-pointer'}"
				>
					決定
				</button>
			{/if}
		</div>
	</div>
</DropContainer>
