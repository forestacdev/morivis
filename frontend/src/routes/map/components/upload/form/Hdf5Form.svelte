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
	import {
		getHdf5RasterDatasets,
		extractHdf5Raster,
		type Hdf5DatasetInfo
	} from '$routes/map/utils/file/hdf5';
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

	// === 共通 ===
	let mode = $state<'raster' | ''>('');
	let entryName = $state('');

	let rasterDatasets = $state<Hdf5DatasetInfo[]>([]);
	let selectedDataset = $state('');
	let rasterAnalyzed = $state(false);

	const hdf5File = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	$effect(() => {
		if (hdf5File) {
			entryName = hdf5File.name.replace(/\.[^.]+$/, '');
			analyzeFile(hdf5File);
		}
	});

	const analyzeFile = async (file: File) => {
		isProcessing.set(true);
		rasterDatasets = [];
		rasterAnalyzed = false;
		selectedDataset = '';
		mode = '';

		try {
			// ラスターデータセットを探す
			const datasets = await getHdf5RasterDatasets(file);
			if (datasets.length > 0) {
				rasterDatasets = datasets;
				rasterAnalyzed = true;
				mode = 'raster';

				if (datasets.length === 1) {
					selectedDataset = datasets[0].path;
				}
			} else {
				showNotification('2D以上のデータセットが見つかりません', 'error');
			}
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'HDF5ファイルの読み込みに失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	// === ラスターモード処理 ===
	const registrationRaster = async () => {
		if (!hdf5File || !selectedDataset) return;

		isProcessing.set(true);

		try {
			const { data, width, height, bbox, nodata } = await extractHdf5Raster(hdf5File, selectedDataset);

			if (width === 0 || height === 0) {
				showNotification(`データサイズが不正です (${width}x${height})`, 'error');
				return;
			}

			const id = `geotiff_${crypto.randomUUID()}`;
			const bands: RasterBands = [data];
			const ranges: BandDataRange[] = [getMinMax(data, nodata)];

			const rawBbox: [number, number, number, number] = bbox && isBboxValid(bbox) ? bbox : [-180, -90, 180, 90];

			await encodeAllBandsToTerrarium(id, bands, width, height, nodata, ranges);

			GeoTiffCache.setSize(id, width, height);
			GeoTiffCache.setNumBands(id, 1);

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
					name: entryName || 'HDF5ラスター',
					tileSize: 256,
					bounds: resolvedBbox,
					xyzImageTile: findCenterTile(resolvedBbox)
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
							single: { index: 0, min: ranges[0].min, max: ranges[0].max, colorMap: 'jet' },
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
			showNotification(`HDF5「${selectedDataset}」を読み込みました`, 'success');
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'データの変換に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">HDF5ファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	{#if hdf5File}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {hdf5File.name}
		</div>
	{/if}

	{#if mode === 'raster' && rasterAnalyzed}
		<!-- ラスターモード -->
		<TextForm bind:value={entryName} label="データ名" />

		{#if rasterDatasets.length > 0}
			<div transition:slide class="w-full">
				<div class="flex flex-col gap-1">
					<label for="hdf5-dataset-select" class="text-sm text-gray-300">
						データセットを選択 ({rasterDatasets.length}件)
					</label>
					<select
						id="hdf5-dataset-select"
						bind:value={selectedDataset}
						class="bg-sub rounded border border-gray-600 p-2 text-sm text-white"
					>
						<option value="" disabled>選択してください</option>
						{#each rasterDatasets as ds}
							<option value={ds.path}>
								{ds.path} [{ds.shape.join('x')}] {ds.dtype}
							</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>

	{#if mode === 'raster'}
		<button
			onclick={registrationRaster}
			disabled={$isProcessing || !selectedDataset}
			class="c-btn-confirm min-w-[200px] p-4 text-lg {$isProcessing || !selectedDataset
				? 'cursor-not-allowed opacity-50'
				: 'cursor-pointer'}"
		>
			決定
		</button>
	{/if}
</div>
