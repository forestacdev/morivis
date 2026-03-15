<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { gpkgToGeoJson, getGpkgInfo, type GpkgInfo } from '$routes/map/utils/file/gpkg';
	import { isBboxValid } from '$routes/map/utils/map';
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
	let rawGeojson = $state<FeatureCollection | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');

	const gpkgFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(gpkgFile?.name.replace(/\.[^.]+$/, '') ?? 'GeoPackageデータ');

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
					if (info.featureTables.length === 1) {
						selectedTable = info.featureTables[0];
						loadTable(info.featureTables[0]);
					} else if (info.featureTables.length === 0) {
						showNotification('フィーチャーテーブルが見つかりませんでした', 'error');
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

	const onTableSelect = (e: Event) => {
		const target = e.target as HTMLSelectElement;
		selectedTable = target.value;
		rawGeojson = null;
		geometryTypeOptions = [];
		selectedGeometryType = '';
		loadTable(target.value);
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
	{#if gpkgInfo && gpkgInfo.featureTables.length > 1}
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
					{#each gpkgInfo.featureTables as table}
						<option value={table}>
							{table}
							{#if gpkgInfo.tableInfo[table]}
								({gpkgInfo.tableInfo[table].count}件)
							{/if}
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
		disabled={$isProcessing || !selectedGeometryType}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!selectedGeometryType
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
