<script lang="ts">
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
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
		parseLandXml,
		landXmlFileToDem,
		type LandXmlSurface,
		type LandXmlParseResult
	} from '$routes/map/utils/file/landxml';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { findCenterTile } from '$routes/map/utils/map/tile';
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

	let parseResult = $state<LandXmlParseResult | null>(null);
	let surfaces = $state<LandXmlSurface[]>([]);
	let surfaceOptions = $state<{ key: string; name: string }[]>([]);
	let selectedSurfaceIndex = $state<string>('0');
	let demResolution = $state<number>(256);

	const xmlFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(xmlFile?.name.replace(/\.[^.]+$/, '') ?? 'LandXMLデータ');

	// ファイルドロップ時: パースしてサーフェス一覧取得
	$effect(() => {
		if (xmlFile) {
			isProcessing.set(true);
			parseLandXml(xmlFile)
				.then((result) => {
					parseResult = result;
					surfaces = result.surfaces;

					if (surfaces.length === 1) {
						selectedSurfaceIndex = '0';
						surfaceOptions = [];
					} else {
						surfaceOptions = surfaces.map((s, i) => ({
							key: String(i),
							name: s.name || `Surface ${i + 1}`
						}));
						selectedSurfaceIndex = '0';
					}
				})
				.catch((e) => {
					showNotification('LandXMLファイルの読み込みに失敗しました', 'error');
					console.error(e);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	/** DEM生成してエントリ作成 */
	const createDemEntry = async (projString?: string) => {
		if (!xmlFile) return;
		isProcessing.set(true);

		try {
			const demResult = await landXmlFileToDem(
				xmlFile,
				Number(selectedSurfaceIndex),
				demResolution,
				projString
			);

			const { data, width, height, bbox, nodata } = demResult;

			// bbox検証: 座標変換が正しくできたか
			if (!isBboxValid(bbox)) {
				// 座標系不明 → ZoneFormで手動選択
				showZoneForm = true;
				focusBbox = bbox;
				return;
			}

			const id = `geotiff_${crypto.randomUUID()}`;

			const bands: RasterBands = [data];
			const ranges: BandDataRange[] = [getMinMax(data, nodata)];

			await encodeAllBandsToTerrarium(id, bands, width, height, nodata, ranges);

			GeoTiffCache.setSize(id, width, height);
			GeoTiffCache.setNumBands(id, 1);

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
					attribution: 'LandXML',
					name: `${entryName}_dem`,
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
			showNotification('DEMラスターを生成しました', 'success');
		} catch (e) {
			showNotification('DEM生成に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};

	// ZoneFormで座標系選択後
	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'landxml') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				const projString = getProjContext(epsg);
				createDemEntry(projString);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">LandXMLファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
>
	{#if parseResult && parseResult.detectedZone}
		<div class="w-full p-2 text-sm text-gray-300">
			検出された座標系: 平面直角座標系 第{parseResult.detectedZone}系
		</div>
	{:else if parseResult && !parseResult.detectedZone}
		<div class="w-full p-2 text-sm text-yellow-400">
			座標系を検出できませんでした。決定後に座標系を選択してください。
		</div>
	{/if}

	{#if surfaceOptions.length > 1}
		<div class="w-full p-2">
			<HorizontalSelectBox
				label="サーフェスを選択"
				bind:group={selectedSurfaceIndex}
				bind:options={surfaceOptions}
			/>
		</div>
	{/if}

	<div class="flex w-full items-center gap-2 p-2">
		<label class="flex grow flex-col gap-1">
			<span class="text-sm text-gray-300">解像度 (長辺ピクセル数)</span>
			<input
				type="number"
				step="1"
				min="64"
				max="4096"
				bind:value={demResolution}
				class="bg-sub rounded border border-gray-600 p-2 text-white"
			/>
		</label>
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={() => createDemEntry()}
		disabled={$isProcessing || surfaces.length === 0}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		surfaces.length === 0
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
