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

	let entryName = $state('');
	let analyzed = $state(false);
	let messages = $state<GribMessage[]>([]);
	let selectedIndex = $state(-1);

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
		selectedIndex = -1;

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
				selectedIndex = 0;
			}

			showNotification(`GRIB2: ${messages.length}メッセージを検出`, 'success');
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'GRIB2の解析に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	/**
	 * サムネイル生成（メルカトル補正）
	 */
	const generateThumbnail = (
		data: Float32Array,
		width: number,
		height: number,
		dataMin: number,
		dataMax: number,
		bbox: [number, number, number, number]
	): string => {
		const DEG2RAD = Math.PI / 180;
		const latToMercY = (lat: number) => Math.log(Math.tan(lat * DEG2RAD * 0.5 + Math.PI / 4));
		const mercYMin = latToMercY(bbox[1]);
		const mercYMax = latToMercY(bbox[3]);
		const lngRange = bbox[2] - bbox[0];
		const mercYRange = mercYMax - mercYMin;
		const mercAspect = mercYRange / (lngRange * DEG2RAD);

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
		const invRange = dataMax !== dataMin ? 255 / (dataMax - dataMin) : 0;

		for (let ty = 0; ty < thumbH; ty++) {
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
				if (val === 0 && srcX === 0 && srcY === 0) {
					pixels[dstIdx + 3] = 0;
				} else {
					const normalized = Math.max(0, Math.min(255, (val - dataMin) * invRange));
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
		if (!analyzed || selectedIndex < 0 || selectedIndex >= messages.length) return;

		isProcessing.set(true);

		try {
			const msg = messages[selectedIndex];
			const { values, nx, ny, la1, lo1, la2, lo2 } = msg;

			const id = `geotiff_${crypto.randomUUID()}`;

			const bands: RasterBands = [values];
			const ranges: BandDataRange[] = [getMinMax(values, null)];

			// bbox: GRIB2はla1が北、la2が南の場合がある
			const minLat = Math.min(la1, la2);
			const maxLat = Math.max(la1, la2);
			const minLon = Math.min(lo1, lo2);
			const maxLon = Math.max(lo1, lo2);
			// bboxが無効（全部0等）の場合はデフォルト範囲を使用
			const rawBbox: [number, number, number, number] =
				minLat === maxLat && minLon === maxLon
					? [120, 20, 150, 50] // 日本域のデフォルト
					: [minLon, minLat, maxLon, maxLat];

			// サムネイル（bboxが有効な場合のみ）
			let mapImage: string | undefined;
			if (rawBbox[0] !== rawBbox[2] && rawBbox[1] !== rawBbox[3]) {
				try {
					mapImage = generateThumbnail(values, nx, ny, ranges[0].min, ranges[0].max, rawBbox);
				} catch {
					// サムネイル生成失敗は無視
				}
			}

			await encodeAllBandsToTerrarium(id, bands, nx, ny, null, ranges);

			GeoTiffCache.setSize(id, nx, ny);
			GeoTiffCache.setNumBands(id, 1);

			// WGS84 → WebMercatorクリップ + 4326再投影
			const resolvedBbox: [number, number, number, number] = [
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, rawBbox[0])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, rawBbox[1])),
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, rawBbox[2])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, rawBbox[3]))
			];

			GeoTiffCache.setBbox(id, resolvedBbox);
			GeoTiffCache.markAs4326(id);
			GeoTiffCache.setRawBbox(id, rawBbox);

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

			console.log('Created RasterImageEntry:', entry);

			showDataEntry = entry;
			showDialogType = null;
			dropFile = null;
			showNotification(`GPV「${msg.label}」を読み込みました`, 'success');
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
				<label for="grib-msg-select" class="text-sm text-gray-300">
					メッセージを選択 ({messages.length}件)
				</label>
				<select
					id="grib-msg-select"
					bind:value={selectedIndex}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				>
					<option value={-1} disabled>選択してください</option>
					{#each messages as msg}
						<option value={msg.index}>
							{msg.index + 1}. {msg.label}
						</option>
					{/each}
				</select>
			</div>
		</div>

		{#if selectedIndex >= 0}
			{@const msg = messages[selectedIndex]}
			<div transition:slide class="flex w-full flex-col gap-1 px-2 text-sm text-gray-300">
				<div>グリッド: {msg.nx} x {msg.ny}</div>
				<div>
					緯度: {Math.min(msg.la1, msg.la2).toFixed(2)} 〜 {Math.max(msg.la1, msg.la2).toFixed(2)}
				</div>
				<div>
					経度: {Math.min(msg.lo1, msg.lo2).toFixed(2)} 〜 {Math.max(msg.lo1, msg.lo2).toFixed(2)}
				</div>
			</div>
		{/if}
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={registration}
		disabled={!analyzed || selectedIndex < 0 || $isProcessing}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {!analyzed || selectedIndex < 0 || $isProcessing
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>
