<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { geoParquetFileToGeoJsonInWorker } from '$routes/map/utils/formats/geoparquet/analyze';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { getFirstUploadFile, toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		pendingZoneGeoRefData: PendingZoneGeoRefData | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable()
	}: Props = $props();

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};

	let rawGeojson: FeatureCollection | null = null;
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let sourceEpsgCode = $state<EpsgCode | null>(null);

	const geoParquetFile = $derived.by(() => {
		if (!dropFile) return null;
		return getFirstUploadFile(dropFile);
	});

	const entryName = $derived(geoParquetFile?.name.replace(/\.[^.]+$/, '') ?? 'GeoParquetデータ');

	$effect(() => {
		if (geoParquetFile) {
			isProcessing.set(true);
			geoParquetFileToGeoJsonInWorker(geoParquetFile)
				.then((result) => {
					rawGeojson = result.geojson;
					sourceEpsgCode = result.sourceEpsgCode;

					const types = getGeometryTypes(result.geojson);
					if (types.length === 1) {
						selectedGeometryType = types[0];
						geometryTypeOptions = [];
						processGeojson();
					} else {
						geometryTypeOptions = types.map((type) => ({
							key: type,
							name: GEOMETRY_TYPE_LABELS[type] ?? type
						}));
						selectedGeometryType = types[0];
					}
				})
				.catch((error) => {
					showNotification('GeoParquetファイルの読み込みに失敗しました', 'error');
					console.error(error);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	const prepareGeojson = async (epsgCode?: EpsgCode): Promise<FeatureCollection | null> => {
		if (!rawGeojson || !selectedGeometryType) return null;

		let geojson = filterByGeometryType(rawGeojson, selectedGeometryType as VectorEntryGeometryType);
		if (geojson.features.length === 0) return null;

		const resolvedEpsgCode = epsgCode ?? sourceEpsgCode;
		if (!resolvedEpsgCode || resolvedEpsgCode === '4326') {
			return geojson;
		}

		const prjContent = getProjContext(resolvedEpsgCode);
		geojson = (await transformGeoJSONParallel(geojson, prjContent)) as FeatureCollection;
		return geojson;
	};

	const completeEntry = async (geojson: FeatureCollection) => {
		const bbox = turfBbox(geojson);
		if (!bbox || !isBboxValid(bbox)) {
			return null;
		}

		return createGeoJsonEntry(
			geojson,
			selectedGeometryType as VectorEntryGeometryType,
			entryName,
			bbox as [number, number, number, number],
			undefined,
			{ attribution: 'GeoParquet' }
		);
	};

	const processGeojson = async () => {
		try {
			const geojson = await prepareGeojson();
			if (!geojson) {
				showNotification('選択したジオメトリタイプのフィーチャが見つかりませんでした', 'error');
				return;
			}

			const bbox = turfBbox(geojson);
			if (!bbox || !isBboxValid(bbox)) {
				if (sourceEpsgCode) {
					showNotification('GeoParquetの座標変換に失敗しました', 'error');
					return;
				}

				pendingZoneGeoRefData = {
					featureCollection: geojson,
					entryName
				};
				transformOptionMode = 'zone';
				focusBbox = bbox as [number, number, number, number];
				return;
			}

			const entry = await completeEntry(geojson);
			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
				return;
			}

			showNotification('データが不正です', 'error');
		} catch (error) {
			showNotification('GeoParquetファイルの変換中にエラーが発生しました', 'error');
			console.error(error);
		}
	};

	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!rawGeojson || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const geojson = await prepareGeojson(epsgCode);
			if (!geojson) {
				showNotification('GeoParquetファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojson);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entry = await completeEntry(geojson);
			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (error) {
			showNotification('GeoParquetファイルの変換中にエラーが発生しました', 'error');
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'geoparquet') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">GeoParquetファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
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
