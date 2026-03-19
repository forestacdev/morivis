<script lang="ts">
	import { fromArrayBuffer } from 'geotiff';
	import { untrack } from 'svelte';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';
	import { GeoTiffCache, getRasters, getMinMax } from '$routes/map/utils/file/geotiff';
	import { findCenterTile, isBboxValid } from '$routes/map/utils/map';
	import { transformBbox } from '$routes/map/utils/proj';
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

	let entryName = $state<string>('');
	let numBands = $state<number>(0);
	let imageWidth = $state<number>(0);
	let imageHeight = $state<number>(0);
	let rawBbox = $state<[number, number, number, number] | null>(null);
	let resolvedBbox = $state<[number, number, number, number] | null>(null);
	let bandMinMax = $state<{ min: number; max: number }>({ min: 0, max: 255 });
	let analyzed = $state<boolean>(false);
	let entryId = $state<string>('');

	const tiffFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	// ファイルドロップ時: GeoTIFF解析
	$effect(() => {
		if (tiffFile) {
			entryName = tiffFile.name.replace(/\.[^.]+$/, '');
			analyzeGeoTiff(tiffFile);
		}
	});

	const analyzeGeoTiff = async (file: File) => {
		isProcessing.set(true);
		analyzed = false;
		resolvedBbox = null;

		try {
			const arrayBuffer = await file.arrayBuffer();
			const tiff = await fromArrayBuffer(arrayBuffer);
			const image = await tiff.getImage();

			const width = image.getWidth();
			const height = image.getHeight();
			imageWidth = width;
			imageHeight = height;

			// bbox取得（GeoTIFFのタイアポイント + スケールから計算）
			const imageBbox = image.getBoundingBox();
			if (imageBbox && imageBbox.length === 4) {
				rawBbox = imageBbox as [number, number, number, number];
			}

			// ラスターデータ読み込み
			const rasterData = await image.readRasters({ interleave: false });
			const result = await getRasters(rasterData, width, height);
			if (!result) {
				throw new Error('ラスターデータの処理に失敗しました');
			}

			const { rastersData, size } = result;
			numBands = size;

			// キャッシュに保存
			const id = `geotiff_${crypto.randomUUID()}`;
			entryId = id;
			GeoTiffCache.setRasters(id, rastersData);
			GeoTiffCache.setSize(id, width, height);
			GeoTiffCache.setNumBands(id, size);

			// nodataの取得
			const nodata =
				image.fileDirectory.GDAL_NODATA !== undefined
					? parseFloat(image.fileDirectory.GDAL_NODATA)
					: null;

			// 最初のバンドのmin/max
			if (size === 1) {
				bandMinMax = getMinMax(rastersData as unknown as Float32Array, nodata);
			} else {
				bandMinMax = getMinMax(rastersData[0], nodata);
			}

			analyzed = true;

			// bboxの有効性チェック
			if (rawBbox && isBboxValid(rawBbox)) {
				// 有効なbbox → そのまま使用
				resolvedBbox = rawBbox;
				GeoTiffCache.setBbox(id, rawBbox);
			} else if (rawBbox) {
				// 無効なbbox → ZoneFormで投影法を選択してもらう
				showZoneForm = true;
				focusBbox = rawBbox;
			}
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'GeoTIFFの解析に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	// ZoneFormで座標系選択後 → bbox座標変換
	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'geotiff') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertBboxWithEpsg(epsg);
			});
		}
	});

	const convertBboxWithEpsg = (epsgCode: EpsgCode) => {
		if (!rawBbox) return;

		try {
			const prjContent = getProjContext(epsgCode);
			const transformed = transformBbox(rawBbox, prjContent);

			if (!isBboxValid(transformed)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			resolvedBbox = transformed;
			if (entryId) {
				GeoTiffCache.setBbox(entryId, transformed);
				// 再投影情報を保存（レンダリング時にUVマップ生成に使用）
				GeoTiffCache.setReproject(entryId, {
					projDef: prjContent,
					srcBbox: rawBbox
				});
			}
		} catch (e) {
			showNotification('座標変換中にエラーが発生しました', 'error');
			console.error(e);
		}
	};

	const registration = () => {
		if (!analyzed || !entryId || !resolvedBbox) return;

		const blobUrl = tiffFile ? URL.createObjectURL(tiffFile) : '';
		GeoTiffCache.setDataUrl(entryId, blobUrl);

		const isSingleBand = numBands === 1;

		const entry: RasterImageEntry<RasterTiffStyle> = {
			id: entryId,
			type: 'raster',
			format: {
				type: 'image',
				url: blobUrl
			},
			metaData: {
				...DEFAULT_CUSTOM_META_DATA,
				name: entryName || 'GeoTIFFデータ',
				tileSize: 256,
				bounds: resolvedBbox,
				xyzImageTile: findCenterTile(resolvedBbox)
			},
			interaction: {
				...DEFAULT_RASTER_BASEMAP_INTERACTION
			},
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
							min: bandMinMax.min,
							max: bandMinMax.max,
							colorMap: 'jet'
						},
						multi: {
							r: { index: 0, min: 0, max: 255 },
							g: { index: numBands >= 2 ? 1 : 0, min: 0, max: 255 },
							b: { index: numBands >= 3 ? 2 : 0, min: 0, max: 255 }
						}
					}
				}
			}
		};

		showDataEntry = entry;
		showDialogType = null;
		dropFile = null;
		showNotification('GeoTIFFファイルを読み込みました', 'success');
	};

	const cancel = () => {
		showDialogType = null;
		dropFile = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">GeoTIFFファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={entryName} label="データ名" />

	{#if tiffFile}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {tiffFile.name}
		</div>
	{/if}

	{#if analyzed}
		<div class="flex w-full flex-col gap-1 px-2 text-sm text-gray-300">
			<div>サイズ: {imageWidth} × {imageHeight} px</div>
			<div>バンド数: {numBands}</div>
			{#if numBands === 1}
				<div>値の範囲: {bandMinMax.min.toFixed(2)} ~ {bandMinMax.max.toFixed(2)}</div>
			{/if}
			{#if resolvedBbox}
				<div>
					範囲: [{resolvedBbox[0].toFixed(6)}, {resolvedBbox[1].toFixed(6)}, {resolvedBbox[2].toFixed(
						6
					)}, {resolvedBbox[3].toFixed(6)}]
				</div>
			{:else if rawBbox}
				<div class="text-yellow-400">座標系が不明です。投影法を選択してください。</div>
			{/if}
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registration}
		disabled={!analyzed || !resolvedBbox || $isProcessing}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {!analyzed || !resolvedBbox || $isProcessing
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>
