<script lang="ts">
	import type { NetCDFReader } from 'netcdfjs';
	import { slide } from 'svelte/transition';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import type { GeoRefData } from '$routes/map/components/upload/form/transform/georef-types';
	import { getAllowedTransformModesForIssue } from '$routes/map/components/upload/transform-policy';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import {
		WEB_MERCATOR_MIN_LAT,
		WEB_MERCATOR_MAX_LAT,
		WEB_MERCATOR_MIN_LNG,
		WEB_MERCATOR_MAX_LNG
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { RasterDiscreteDimension } from '$routes/map/data/types/raster';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { GeoTiffCache, type BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
	import {
		encodeAllBandsToTerrarium,
		getMinMax,
		type RasterBands
	} from '$routes/map/utils/formats/geotiff';
	import { sampleRasterMeshHeights } from '$routes/map/utils/formats/geotiff/mesh';
	import {
		parseNetCDF,
		extractRasterData,
		getDimensionValues,
		resolveTimeValues,
		type NetCDFInfo,
		type NetCDFVariableInfo
	} from '$routes/map/utils/formats/netcdf';
	import { NetCDFDataCache } from '$routes/map/utils/formats/netcdf/cache';
	import { createRasterGeoRefData } from '$routes/map/utils/formats/raster/georef';
	import { generateThumbnail } from '$routes/map/utils/formats/raster/thumbnail';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		geoRefData: GeoRefData | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();

	let entryName = $state('');
	let ncInfo = $state<NetCDFInfo | null>(null);
	let ncReader = $state<NetCDFReader | null>(null);
	let selectedVariable = $state('');
	let analyzed = $state(false);
	let registrationMode = $state<'raster' | 'mesh'>('raster');

	// 3D以上の次元のスライス選択
	let extraDimensions = $state<
		{ name: string; size: number; values: number[] | string[] | null }[]
	>([]);
	let sliceIndices = $state<Record<string, number>>({});
	const canCreateMesh = $derived(Boolean(selectedVariable));
	const registrationModeOptions = $derived.by(() =>
		canCreateMesh
			? [
					{ key: 'raster', name: 'ラスター' },
					{ key: 'mesh', name: '3Dメッシュ' }
				]
			: [{ key: 'raster', name: 'ラスター' }]
	);

	const ncFile = $derived.by(() => {
		const file = getFirstUploadFile(dropFile);
		return file && /\.(nc4?|netcdf)$/i.test(file.name) ? file : null;
	});
	const getPlacementAllowedTransformModes = () =>
		getAllowedTransformModesForIssue(showDialogType, 'placement-missing');

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
		registrationMode = 'raster';

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

			// NetCDFの座標はWGS84（4326）
			const rawBbox: [number, number, number, number] = bbox ?? [-180, -90, 180, 90];

			// サムネイル画像を生成（メルカトル補正）
			const mapImage = generateThumbnail({
				bands: [data],
				width,
				height,
				bbox: rawBbox,
				nodata,
				ranges
			});

			await encodeAllBandsToTerrarium(id, bands, width, height, nodata, ranges);

			GeoTiffCache.setSize(id, width, height);
			GeoTiffCache.setNumBands(id, 1);

			// WebMercator範囲にクリップして4326再投影を有効化
			const resolvedBbox: [number, number, number, number] = [
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, rawBbox[0])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, rawBbox[1])),
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, rawBbox[2])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, rawBbox[3]))
			];
			const variable = ncInfo.rasterVariables.find((v) => v.name === selectedVariable);
			const unit = variable?.attributes['units'] ?? '';
			const longName = variable?.attributes['long_name'] ?? selectedVariable;

			// 時間次元の検出
			let dimension: RasterDiscreteDimension | undefined;
			let initialDimensionIndex = 0;
			if (variable && extraDimensions.length > 0) {
				const timeDim = extraDimensions.find((d) => /^(time|t|date|datetime)$/i.test(d.name));
				if (timeDim && timeDim.size > 1) {
					const timeValues = timeDim.values
						? resolveTimeValues(timeDim.values, ncInfo, timeDim.name)
						: Array.from({ length: timeDim.size }, (_, i) => String(i));

					dimension = {
						type: 'time',
						values: timeValues
					};
					initialDimensionIndex = sliceIndices[timeDim.name] ?? 0;

					const fixedSlices = { ...sliceIndices };
					delete fixedSlices[timeDim.name];

					NetCDFDataCache.set(id, {
						reader: ncReader,
						info: ncInfo,
						variableName: selectedVariable,
						sliceIndices: fixedSlices,
						timeDimName: timeDim.name,
						width,
						height,
						nodata,
						encodedTimeIndex: initialDimensionIndex
					});
				}
			}

			if (registrationMode === 'mesh') {
				const meshHeightSampling = sampleRasterMeshHeights({
					band: data,
					width,
					height,
					nodata,
					bounds: resolvedBbox,
					baseValue: ranges[0].min,
					autoHeightScale: true
				});
				if (!ncFile) {
					throw new Error('NetCDFファイルが見つかりません');
				}

				geoRefData = createRasterGeoRefData({
					entryId: id,
					entryName: entryName || `${longName} 3Dメッシュ`,
					parsedBands: bands,
					parsedNodata: nodata,
					dataRanges: ranges,
					imageWidth: width,
					imageHeight: height,
					imageFile: ncFile,
					registrationMode,
					allowedTransformModes: getPlacementAllowedTransformModes(),
					meshConfig: {
						baseValue: meshHeightSampling.effectiveBaseValue,
						heightScale: meshHeightSampling.effectiveHeightScale,
						attribution: 'NetCDF 3D Mesh',
						opacity: 0.7,
						shadingEnabled: false,
						heightColorRampEnabled: true,
						temporalDimension: dimension,
						initialDimensionIndex
					}
				});
				showDialogType = null;
				transformOptionMode = 'georef';
				showNotification(`NetCDF変数「${longName}」の位置合わせを設定してください`, 'info');
				return;
			}

			GeoTiffCache.setBbox(id, resolvedBbox);
			GeoTiffCache.markAs4326(id);
			GeoTiffCache.setRawBbox(id, rawBbox);
			const entry: RasterImageEntry<RasterTiffStyle> = {
				id,
				type: 'raster',
				format: {
					type: 'image',
					url: ''
				},
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					attribution: 'NetCDF',
					name: entryName || `${longName}`,
					tileSize: 256,
					bounds: resolvedBbox,
					xyzImageTile: findCenterTile(resolvedBbox),
					mapImage
				},
				interaction: {
					...DEFAULT_RASTER_BASEMAP_INTERACTION
				},
				...(dimension && {
					state: {
						dimension: {
							currentIndex: initialDimensionIndex
						}
					}
				}),
				properties: {
					...(dimension && {
						temporal: {
							dimension,
							behaviors: [{ type: 'source' as const }]
						}
					}),
					bands: {
						numBands: 1
					}
				},
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
						{#each ncInfo.rasterVariables as variable (variable.name)}
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

		<!-- 追加次元のスライス選択（時間次元は除外） -->
		{@const nonTimeDims = extraDimensions.filter((d) => !/^(time|t|date|datetime)$/i.test(d.name))}
		{#if selectedVariable && nonTimeDims.length > 0}
			{#each nonTimeDims as dim (dim.name)}
				<div transition:slide class="w-full">
					<div class="flex flex-col gap-1">
						<label for="nc-dim-{dim.name}" class="text-sm text-gray-300">
							{dim.name}
						</label>
						<select
							id="nc-dim-{dim.name}"
							bind:value={sliceIndices[dim.name]}
							class="bg-sub rounded border border-gray-600 p-2 text-white"
						>
							{#each Array.from({ length: dim.size }, (_, i) => i) as idx (idx)}
								<option value={idx}>
									{dim.values ? dim.values[idx] : idx}
								</option>
							{/each}
						</select>
					</div>
				</div>
			{/each}
		{/if}

		{#if selectedVariable}
			<div class="w-full px-2">
				<HorizontalSelectBox
					label="登録方法"
					options={registrationModeOptions}
					bind:group={registrationMode}
				/>
				<p class="mt-2 text-xs text-gray-400">
					3Dメッシュは選択中の変数スライスを高さとして GLB に変換して登録します
				</p>
			</div>
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
