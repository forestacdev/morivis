<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import Checkbox from '$routes/map/components/layer_menu/Checkbox.svelte';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import { createAutoGeoJsonEntry } from '$routes/map/components/upload/form/geojson-entry';
	import {
		getGeometryTypes,
		filterByGeometryType,
		filterByProperty,
		groupPropertyByGeometryType,
		buildDxfStyle
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { dwgFileToGeoJsonInWorker } from '$routes/map/utils/formats/dwg/analyze';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
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

	let layersByGeometryType = $state<Record<string, string[]> | null>(null);
	let layerChecked = $state<Record<string, boolean>>({});
	let entityTypesByGeometryType = $state<Record<string, string[]>>({});

	const selectedLayers = $derived(
		Object.entries(layerChecked)
			.filter(([, value]) => value)
			.map(([key]) => key)
	);

	$effect(() => {
		if (layersByGeometryType && selectedGeometryType) {
			const names = layersByGeometryType[selectedGeometryType] ?? [];
			layerChecked = Object.fromEntries(names.map((name) => [name, true]));
		}
	});

	const dwgFile = $derived.by(() => {
		if (!dropFile) return null;
		return getFirstUploadFile(dropFile);
	});

	const extractLayer = (props: Record<string, unknown>) =>
		props?.layer != null ? String(props.layer) : undefined;

	const getErrorMessage = (error: unknown, fallback: string) =>
		error instanceof Error && error.message ? error.message : fallback;

	$effect(() => {
		if (dwgFile) {
			isProcessing.set(true);
			dwgFileToGeoJsonInWorker(dwgFile)
				.then((geojson) => {
					rawGeojson = geojson as unknown as FeatureCollection;
					const types = getGeometryTypes(rawGeojson);

					if (types.length === 1) {
						selectedGeometryType = types[0];
						geometryTypeOptions = [];
					} else {
						geometryTypeOptions = types.map((type) => ({
							key: type,
							name: GEOMETRY_TYPE_LABELS[type] ?? type
						}));
						selectedGeometryType = types[0];
					}

					layersByGeometryType = groupPropertyByGeometryType(rawGeojson, extractLayer);

					const entityTypeMap: Record<string, Set<string>> = {};
					for (const feature of rawGeojson.features) {
						const props = feature.properties as Record<string, unknown>;
						const entityType = props?.type != null ? String(props.type) : undefined;
						const geometryType = feature.geometry?.type;
						if (!entityType || !geometryType) continue;
						const key =
							geometryType === 'Point' || geometryType === 'MultiPoint'
								? 'Point'
								: geometryType === 'LineString' || geometryType === 'MultiLineString'
									? 'LineString'
									: geometryType === 'Polygon' || geometryType === 'MultiPolygon'
										? 'Polygon'
										: geometryType;
						if (!entityTypeMap[key]) entityTypeMap[key] = new Set();
						entityTypeMap[key].add(entityType);
					}
					entityTypesByGeometryType = Object.fromEntries(
						Object.entries(entityTypeMap).map(([key, value]) => [key, [...value].sort()])
					);
				})
				.catch((error) => {
					showNotification(
						getErrorMessage(error, 'DWGファイルの読み込みに失敗しました'),
						'error'
					);
					console.error(error);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	const openZoneSelection = () => {
		if (rawGeojson && selectedGeometryType) {
			let filtered = filterByGeometryType(rawGeojson, selectedGeometryType);
			if (selectedLayers.length > 0) {
				filtered = filterByProperty(filtered, selectedLayers, extractLayer);
			}
			pendingZoneGeoRefData = {
				featureCollection: filtered as FeatureCollection,
				entryName: dwgFile?.name.replace(/\.[^.]+$/, '') ?? 'DWGデータ'
			};
		} else if (rawGeojson) {
			pendingZoneGeoRefData = {
				featureCollection: rawGeojson,
				entryName: dwgFile?.name.replace(/\.[^.]+$/, '') ?? 'DWGデータ'
			};
		}

		transformOptionMode = 'zone';

		if (rawGeojson && selectedGeometryType) {
			let filtered = filterByGeometryType(rawGeojson, selectedGeometryType);
			if (selectedLayers.length > 0) {
				filtered = filterByProperty(filtered, selectedLayers, extractLayer);
			}
			focusBbox = turfBbox(filtered) as [number, number, number, number];
		} else {
			focusBbox = rawGeojson ? (turfBbox(rawGeojson) as [number, number, number, number]) : null;
		}
	};

	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!dwgFile || !rawGeojson || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const transformedGeojson = (await transformGeoJSONParallel(
				rawGeojson,
				prjContent
			)) as FeatureCollection;

			let geojsonData = filterByGeometryType(transformedGeojson, selectedGeometryType);
			if (selectedLayers.length > 0) {
				geojsonData = filterByProperty(geojsonData, selectedLayers, extractLayer);
			}

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('DWGファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entryName = dwgFile.name.replace(/\.[^.]+$/, '');
			const propKeys = Object.keys(geojsonData.features[0]?.properties ?? {});
			const style = buildDxfStyle(geojsonData, selectedGeometryType, propKeys);
			const entry = await createAutoGeoJsonEntry({
				geojson: geojsonData,
				geometryType: selectedGeometryType,
				name: entryName,
				bbox: bbox as [number, number, number, number],
				style,
				attribution: 'DWG'
			});

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (error) {
			showNotification(
				getErrorMessage(error, 'DWGファイルの変換中にエラーが発生しました'),
				'error'
			);
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
		if (zoneConfirmedEpsg && showDialogType === 'dwg') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-2">
	<span class="text-2xl font-bold">DWGファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
>
	{#if geometryTypeOptions.length > 1}
		<div class="w-full p-2">
			<HorizontalSelectBox
				label="ジオメトリタイプを選択"
				bind:group={selectedGeometryType}
				bind:options={geometryTypeOptions}
			/>
		</div>

		{#if entityTypesByGeometryType[selectedGeometryType]?.length}
			<div class="flex w-full flex-wrap items-center gap-1 px-2">
				<span class="text-xs text-gray-400">含まれる要素:</span>
				{#each entityTypesByGeometryType[selectedGeometryType] as entityType (entityType)}
					<span class="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
						{entityType}
					</span>
				{/each}
			</div>
		{/if}
	{/if}

	{#if layersByGeometryType && layersByGeometryType[selectedGeometryType]?.length}
		<div class="w-full px-2">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-300">レイヤー</span>
				<div class="flex gap-2">
					<button
						class="c-btn-sub pointer-events-auto text-xs"
						onclick={() => {
							const names = layersByGeometryType?.[selectedGeometryType] ?? [];
							layerChecked = Object.fromEntries(names.map((name) => [name, true]));
						}}>全選択</button
					>
					<button
						class="c-btn-sub pointer-events-auto text-xs"
						onclick={() => {
							const names = layersByGeometryType?.[selectedGeometryType] ?? [];
							layerChecked = Object.fromEntries(names.map((name) => [name, false]));
						}}>全解除</button
					>
				</div>
			</div>

			<div class="flex flex-col gap-1">
				{#each layersByGeometryType[selectedGeometryType] as layer (layer)}
					<Checkbox label={layer} bind:value={layerChecked[layer]} />
				{/each}
			</div>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={openZoneSelection}
		disabled={$isProcessing || !selectedGeometryType || selectedLayers.length === 0}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!selectedGeometryType ||
		selectedLayers.length === 0
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
