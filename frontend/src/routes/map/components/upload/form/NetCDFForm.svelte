<script lang="ts">
	import type { NetCDFReader } from 'netcdfjs';
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
	import {
		parseNetCDF,
		extractRasterData,
		getDimensionValues,
		type NetCDFInfo,
		type NetCDFVariableInfo
	} from '$routes/map/utils/file/netcdf';
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
	let ncInfo = $state<NetCDFInfo | null>(null);
	let ncReader = $state<NetCDFReader | null>(null);
	let selectedVariable = $state('');
	let analyzed = $state(false);

	// 3D以上の次元のスライス選択
	let extraDimensions = $state<
		{ name: string; size: number; values: number[] | string[] | null }[]
	>([]);
	let sliceIndices = $state<Record<string, number>>({});

	const ncFile = $derived.by(() => {
		if (!dropFile) return null;
		if (dropFile instanceof FileList) {
			return Array.from(dropFile).find((f) => /\.(nc4?|netcdf)$/i.test(f.name)) ?? null;
		}
		return dropFile;
	});

	$effect(() => {
		if (ncFile) {
			entryName = ncFile.name.replace(/\.[^.]+$/, '');
			analyzeNetCDF(ncFile);
		}
	});

	const analyzeNetCDF = async (file: File) => {
		isProcessing.set(true);
		analyzed = false;
		ncInfo = null;
		ncReader = null;
		selectedVariable = '';
		extraDimensions = [];
		sliceIndices = {};

		try {
			const arrayBuffer = await file.arrayBuffer();
			const { reader, info } = parseNetCDF(arrayBuffer);

			ncReader = reader;
			ncInfo = info;
			analyzed = true;

			// ラスター変数が1つだけなら自動選択
			if (info.rasterVariables.length === 1) {
				selectedVariable = info.rasterVariables[0].name;
				updateExtraDimensions(info.rasterVariables[0]);
			}
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'NetCDFの解析に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const updateExtraDimensions = (variable: NetCDFVariableInfo) => {
		if (!ncReader || !ncInfo) return;

		// 最後の2次元（Y, X）以外の次元を抽出
		const extras = variable.dimensions.slice(0, -2);
		extraDimensions = extras.map((dimName) => {
			const dim = ncInfo!.dimensions.find((d) => d.name === dimName);
			const values = getDimensionValues(ncReader!, dimName, ncInfo!);
			return {
				name: dimName,
				size: dim?.size ?? 0,
				values
			};
		});

		// デフォルトはすべて0番目
		sliceIndices = {};
		for (const dim of extras) {
			sliceIndices[dim] = 0;
		}
	};

	const onVariableChange = () => {
		if (!ncInfo) return;
		const variable = ncInfo.rasterVariables.find((v) => v.name === selectedVariable);
		if (variable) {
			updateExtraDimensions(variable);
		}
	};

	/**
	 * 単バンドFloat32Arrayから512x512サムネイルを生成（中心正方形切り抜き）
	 */
	const generateThumbnail = (
		bandData: Float32Array,
		width: number,
		height: number,
		dataMin: number,
		dataMax: number,
		nodataVal: number | null
	): string => {
		const size = Math.min(width, height);
		const sx = Math.floor((width - size) / 2);
		const sy = Math.floor((height - size) / 2);

		const thumbSize = 512;
		const canvas = new OffscreenCanvas(thumbSize, thumbSize);
		const ctx = canvas.getContext('2d')!;
		const imgData = ctx.createImageData(thumbSize, thumbSize);
		const pixels = imgData.data;

		const range = dataMax - dataMin;
		const invRange = range !== 0 ? 255 / range : 0;

		for (let ty = 0; ty < thumbSize; ty++) {
			for (let tx = 0; tx < thumbSize; tx++) {
				const srcX = sx + Math.floor((tx * size) / thumbSize);
				const srcY = sy + Math.floor((ty * size) / thumbSize);
				const srcIdx = srcY * width + srcX;
				const dstIdx = (ty * thumbSize + tx) * 4;

				const val = bandData[srcIdx];
				if (nodataVal !== null && val === nodataVal) {
					pixels[dstIdx + 3] = 0; // 透明
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
		tempCanvas.width = thumbSize;
		tempCanvas.height = thumbSize;
		const tempCtx = tempCanvas.getContext('2d')!;
		tempCtx.putImageData(imgData, 0, 0);
		return tempCanvas.toDataURL('image/png');
	};

	const registration = async () => {
		if (!ncReader || !ncInfo || !selectedVariable) return;

		isProcessing.set(true);

		try {
			const { data, width, height, bbox, nodata } = extractRasterData(
				ncReader,
				selectedVariable,
				ncInfo,
				sliceIndices
			);

			console.log(
				'[NetCDF] variable:',
				selectedVariable,
				'width:',
				width,
				'height:',
				height,
				'data length:',
				data.length,
				'bbox:',
				bbox
			);

			if (width === 0 || height === 0) {
				showNotification(
					`データサイズが不正です (${width}x${height})。変数の次元構造を確認してください。`,
					'error'
				);
				return;
			}

			const id = `geotiff_${crypto.randomUUID()}`;

			// 1バンドとしてTerrariumエンコード
			const bands: RasterBands = [data];
			const ranges: BandDataRange[] = [getMinMax(data, nodata)];

			// サムネイル画像を生成
			const mapImage = generateThumbnail(data, width, height, ranges[0].min, ranges[0].max, nodata);

			await encodeAllBandsToTerrarium(id, bands, width, height, nodata, ranges);

			GeoTiffCache.setSize(id, width, height);
			GeoTiffCache.setNumBands(id, 1);

			// NetCDFの座標はWGS84（4326）→ WebMercator範囲にクリップして4326再投影を有効化
			const rawBbox: [number, number, number, number] = bbox ?? [-180, -90, 180, 90];
			const resolvedBbox: [number, number, number, number] = [
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, rawBbox[0])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, rawBbox[1])),
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, rawBbox[2])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, rawBbox[3]))
			];

			GeoTiffCache.setBbox(id, resolvedBbox);
			GeoTiffCache.markAs4326(id);
			GeoTiffCache.setRawBbox(id, rawBbox);

			const variable = ncInfo.rasterVariables.find((v) => v.name === selectedVariable);
			const unit = variable?.attributes['units'] ?? '';
			const longName = variable?.attributes['long_name'] ?? selectedVariable;

			const entry: RasterImageEntry<RasterTiffStyle> = {
				id,
				type: 'raster',
				format: {
					type: 'image',
					url: ''
				},
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					name: entryName || `${longName}`,
					tileSize: 256,
					bounds: resolvedBbox,
					xyzImageTile: findCenterTile(resolvedBbox),
					mapImage
				},
				interaction: {
					...DEFAULT_RASTER_BASEMAP_INTERACTION
				},
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
			showNotification(
				`NetCDF変数「${longName}」${unit ? `(${unit})` : ''} を読み込みました`,
				'success'
			);
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'データの変換に失敗しました', 'error');
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
	<span class="text-2xl font-bold">NetCDFファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={entryName} label="データ名" />

	{#if ncFile}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {ncFile.name}
		</div>
	{/if}

	{#if ncInfo}
		<div class="flex w-full flex-col gap-1 px-2 text-sm text-gray-300">
			<div>次元: {ncInfo.dimensions.map((d) => `${d.name}(${d.size})`).join(', ')}</div>
			{#if ncInfo.latVar && ncInfo.lonVar}
				<div>座標変数: {ncInfo.latVar}, {ncInfo.lonVar}</div>
			{/if}
		</div>

		<!-- 変数選択 -->
		{#if ncInfo.rasterVariables.length > 0}
			<div transition:slide class="w-full">
				<div class="flex flex-col gap-1">
					<label for="nc-var-select" class="text-sm text-gray-300">変数を選択</label>
					<select
						id="nc-var-select"
						bind:value={selectedVariable}
						onchange={onVariableChange}
						class="bg-sub rounded border border-gray-600 p-2 text-white"
					>
						<option value="" disabled>選択してください</option>
						{#each ncInfo.rasterVariables as variable}
							<option value={variable.name}>
								{variable.name}
								{#if variable.attributes['long_name']}
									- {variable.attributes['long_name']}
								{/if}
								{#if variable.attributes['units']}
									({variable.attributes['units']})
								{/if}
								[{variable.shape.join('x')}]
							</option>
						{/each}
					</select>
				</div>
			</div>
		{:else}
			<div class="w-full px-2 text-sm text-red-400">2D以上の変数が見つかりません</div>
		{/if}

		<!-- 追加次元のスライス選択（time等） -->
		{#if selectedVariable && extraDimensions.length > 0}
			{#each extraDimensions as dim}
				<div transition:slide class="w-full">
					<div class="flex flex-col gap-1">
						<label for="nc-dim-{dim.name}" class="text-sm text-gray-300">
							{dim.name} (0〜{dim.size - 1})
						</label>
						<div class="flex items-center gap-2">
							<input
								id="nc-dim-{dim.name}"
								type="range"
								min={0}
								max={dim.size - 1}
								bind:value={sliceIndices[dim.name]}
								class="w-full"
							/>
							<span class="w-20 text-right text-sm text-white">
								{#if dim.values}
									{dim.values[sliceIndices[dim.name] ?? 0]}
								{:else}
									{sliceIndices[dim.name] ?? 0}
								{/if}
							</span>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={registration}
		disabled={!analyzed || !selectedVariable || $isProcessing}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {!analyzed || !selectedVariable || $isProcessing
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>
