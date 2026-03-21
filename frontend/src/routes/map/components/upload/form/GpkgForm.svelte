<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import {
		GeoTiffCache,
		encodeAllBandsToTerrarium,
		type RasterBands,
		type BandDataRange
	} from '$routes/map/utils/file/geotiff';
	import {
		gpkgToGeoJson,
		gpkgToRaster,
		getGpkgInfo,
		type GpkgInfo
	} from '$routes/map/utils/file/gpkg';
	import { findCenterTile, isBboxValid } from '$routes/map/utils/map';
	import { transformBbox } from '$routes/map/utils/proj';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
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

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン',
		Label: 'ラベル'
	};

	let gpkgBuffer = $state<Uint8Array | null>(null);
	let gpkgInfo = $state<GpkgInfo | null>(null);
	let selectedTable = $state<string>('');
	let selectedTableType = $state<'feature' | 'tile' | ''>('');
	let rawGeojson = $state<FeatureCollection | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let rasterReady = $state(false);

	const gpkgFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(gpkgFile?.name.replace(/\.[^.]+$/, '') ?? 'GeoPackageデータ');

	// テーブル一覧（feature + tile を統合）
	const allTables = $derived.by(() => {
		if (!gpkgInfo) return [];
		const tables: { name: string; type: 'feature' | 'tile'; label: string }[] = [];
		for (const t of gpkgInfo.featureTables) {
			const info = gpkgInfo.tableInfo[t];
			tables.push({ name: t, type: 'feature', label: `${t} (${info?.count ?? 0}件)` });
		}
		for (const t of gpkgInfo.tileTables) {
			const info = gpkgInfo.tableInfo[t];
			const suffix = info?.isGriddedCoverage ? 'グリッド' : 'タイル';
			tables.push({ name: t, type: 'tile', label: `${t} (${suffix}, ${info?.count ?? 0}枚)` });
		}
		return tables;
	});

	// ファイルドロップ時: テーブル一覧取得
	$effect(() => {
		if (gpkgFile) {
			isProcessing.set(true);
			gpkgFile
				.arrayBuffer()
				.then((buffer) => {
					gpkgBuffer = new Uint8Array(buffer);
					return getGpkgInfo(gpkgBuffer);
				})
				.then((info) => {
					gpkgInfo = info;
					const totalTables = info.featureTables.length + info.tileTables.length;
					if (totalTables === 1) {
						const table = info.featureTables[0] ?? info.tileTables[0];
						const type = info.featureTables.length > 0 ? 'feature' : 'tile';
						selectedTable = table;
						selectedTableType = type as 'feature' | 'tile';
						if (type === 'feature') {
							loadTable(table);
						} else {
							loadTileTable(table);
						}
					} else if (totalTables === 0) {
						showNotification('テーブルが見つかりませんでした', 'error');
					}
				})
				.catch((e) => {
					showNotification('GeoPackageファイルの読み込みに失敗しました', 'error');
					console.error(e);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	const loadTable = async (tableName: string) => {
		if (!gpkgBuffer) return;
		isProcessing.set(true);

		try {
			const geojson = await gpkgToGeoJson(gpkgBuffer, { tableName });
			rawGeojson = geojson as unknown as FeatureCollection;

			const types = getGeometryTypes(rawGeojson);
			if (types.length === 1) {
				selectedGeometryType = types[0];
				geometryTypeOptions = [];
				processGeojson();
			} else if (types.length > 1) {
				geometryTypeOptions = types.map((t) => ({
					key: t,
					name: GEOMETRY_TYPE_LABELS[t] ?? t
				}));
				selectedGeometryType = types[0];
			} else {
				showNotification('フィーチャーが見つかりませんでした', 'error');
			}
		} catch (e) {
			showNotification('テーブルの読み込みに失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const loadTileTable = async (tableName: string) => {
		if (!gpkgBuffer) return;
		isProcessing.set(true);
		rasterReady = false;

		try {
			const result = await gpkgToRaster(gpkgBuffer, tableName);
			const id = `geotiff_${crypto.randomUUID()}`;

			GeoTiffCache.setSize(id, result.width, result.height);
			GeoTiffCache.setNumBands(id, result.bands.length);

			// bbox処理
			let resolvedBbox = result.bounds;
			if (result.epsg && result.epsg !== 4326) {
				try {
					const prj = getProjContext(String(result.epsg) as EpsgCode);
					const transformed = transformBbox(result.bounds, prj);
					if (isBboxValid(transformed)) {
						resolvedBbox = transformed;
					}
				} catch {
					// 変換失敗時はZoneFormへ
				}
			}

			if (!isBboxValid(resolvedBbox)) {
				showZoneForm = true;
				focusBbox = result.bounds;
				// rasterデータは一時保存して後で使う
				rasterReady = false;
				return;
			}

			GeoTiffCache.setBbox(id, resolvedBbox);

			// サムネイル生成
			const thumbSize = 512;
			const thumbCanvas = new OffscreenCanvas(thumbSize, thumbSize);
			const thumbCtx = thumbCanvas.getContext('2d')!;
			const thumbImg = thumbCtx.createImageData(thumbSize, thumbSize);
			const thumbData = thumbImg.data;
			const hasRgb = result.bands.length >= 3;
			const size = Math.min(result.width, result.height);
			const sx = Math.floor((result.width - size) / 2);
			const sy = Math.floor((result.height - size) / 2);

			for (let ty = 0; ty < thumbSize; ty++) {
				for (let tx = 0; tx < thumbSize; tx++) {
					const srcX = sx + Math.floor((tx * size) / thumbSize);
					const srcY = sy + Math.floor((ty * size) / thumbSize);
					const srcIdx = srcY * result.width + srcX;
					const dstIdx = (ty * thumbSize + tx) * 4;

					if (hasRgb) {
						thumbData[dstIdx] = result.bands[0][srcIdx];
						thumbData[dstIdx + 1] = result.bands[1][srcIdx];
						thumbData[dstIdx + 2] = result.bands[2][srcIdx];
					} else {
						const v = result.bands[0][srcIdx];
						thumbData[dstIdx] = v;
						thumbData[dstIdx + 1] = v;
						thumbData[dstIdx + 2] = v;
					}
					thumbData[dstIdx + 3] = 255;
				}
			}
			thumbCtx.putImageData(thumbImg, 0, 0);
			const tempCanvas = document.createElement('canvas');
			tempCanvas.width = thumbSize;
			tempCanvas.height = thumbSize;
			const tempCtx = tempCanvas.getContext('2d')!;
			tempCtx.putImageData(thumbImg, 0, 0);
			const mapImage = tempCanvas.toDataURL('image/png');

			await encodeAllBandsToTerrarium(
				id,
				result.bands,
				result.width,
				result.height,
				result.nodata,
				result.dataRanges
			);

			const isSingleBand = result.bands.length === 1;
			const bandMinMax = result.dataRanges[0];

			const entry: RasterImageEntry<RasterTiffStyle> = {
				id,
				type: 'raster',
				format: { type: 'image', url: '' },
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					name: entryName,
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
						numBands: result.bands.length,
						mode: isSingleBand ? 'single' : 'multi',
						uniformsData: {
							single: {
								index: 0,
								min: bandMinMax.min,
								max: bandMinMax.max,
								colorMap: 'jet'
							},
							multi: {
								r: { index: 0, min: result.dataRanges[0].min, max: result.dataRanges[0].max },
								g: {
									index: result.bands.length >= 2 ? 1 : 0,
									min: (result.dataRanges[1] ?? result.dataRanges[0]).min,
									max: (result.dataRanges[1] ?? result.dataRanges[0]).max
								},
								b: {
									index: result.bands.length >= 3 ? 2 : 0,
									min: (result.dataRanges[2] ?? result.dataRanges[0]).min,
									max: (result.dataRanges[2] ?? result.dataRanges[0]).max
								}
							}
						}
					}
				}
			};

			showDataEntry = entry;
			showDialogType = null;
			dropFile = null;
			showNotification('タイルデータを読み込みました', 'success');
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'タイルデータの読み込みに失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const onTableSelect = (e: Event) => {
		const target = e.target as HTMLSelectElement;
		const name = target.value;
		selectedTable = name;
		rawGeojson = null;
		geometryTypeOptions = [];
		selectedGeometryType = '';
		rasterReady = false;

		// テーブルタイプ判定
		const tableEntry = allTables.find((t) => t.name === name);
		selectedTableType = tableEntry?.type ?? '';
		if (tableEntry?.type === 'tile') {
			loadTileTable(name);
		} else {
			loadTable(name);
		}
	};

	const processGeojson = () => {
		let filtered = rawGeojson;
		if (rawGeojson && selectedGeometryType) {
			filtered = filterByGeometryType(rawGeojson, selectedGeometryType as VectorEntryGeometryType);
		}

		if (!filtered || filtered.features.length === 0) {
			showNotification('選択したジオメトリタイプのフィーチャが見つかりませんでした', 'error');
			return;
		}

		const bbox = turfBbox(filtered);

		if (!bbox || !isBboxValid(bbox)) {
			showZoneForm = true;
			focusBbox = bbox as [number, number, number, number];
		} else {
			const entry = createGeoJsonEntry(
				filtered,
				selectedGeometryType as VectorEntryGeometryType,
				entryName,
				bbox as [number, number, number, number],
				'default'
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			} else {
				showNotification('データが不正です', 'error');
			}
		}
	};

	// ZoneFormで座標系選択後 → 座標変換してエントリ作成
	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!rawGeojson || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const plainGeojson = JSON.parse(JSON.stringify(rawGeojson));

			const transformedGeojson = (await transformGeoJSONParallel(
				plainGeojson,
				prjContent
			)) as FeatureCollection;

			let geojsonData = filterByGeometryType(
				transformedGeojson,
				selectedGeometryType as VectorEntryGeometryType
			);

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entry = createGeoJsonEntry(
				geojsonData,
				selectedGeometryType,
				entryName,
				bbox as [number, number, number, number],
				'default'
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (e) {
			showNotification('変換中にエラーが発生しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'gpkg') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">GeoPackageファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	{#if allTables.length > 1}
		<div class="w-full p-2">
			<div class="flex flex-col gap-1">
				<label for="table-select" class="text-sm text-gray-300">テーブルを選択</label>
				<select
					id="table-select"
					value={selectedTable}
					onchange={onTableSelect}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				>
					<option value="" disabled>選択してください</option>
					{#each allTables as table}
						<option value={table.name}>
							{table.label}
						</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}

	{#if geometryTypeOptions.length > 1}
		<div class="w-full p-2">
			<HorizontalSelectBox
				label="ジオメトリタイプを選択"
				bind:group={selectedGeometryType}
				bind:options={geometryTypeOptions}
			/>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={processGeojson}
		disabled={$isProcessing || !selectedGeometryType || selectedTableType === 'tile'}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!selectedGeometryType ||
		selectedTableType === 'tile'
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
