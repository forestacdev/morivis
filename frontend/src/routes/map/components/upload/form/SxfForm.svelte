<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import Checkbox from '$routes/map/components/layer_menu/Checkbox.svelte';
	import { createAutoGeoJsonEntry } from '$routes/map/components/upload/form/geojson-entry';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import {
		buildSxfStyle,
		filterByGeometryType,
		filterByProperty,
		getGeometryTypes,
		groupPropertyByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { sxfFileToGeoJsonInWorker } from '$routes/map/utils/formats/sxf/analyze';
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

	let rawGeojson = $state<FeatureCollection | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let layersByGeometryType = $state<Record<string, string[]> | null>(null);
	let layerChecked = $state<Record<string, boolean>>({});

	const sxfFile = $derived.by(() => {
		if (!dropFile) return null;
		return getFirstUploadFile(dropFile);
	});
	const entryName = $derived(sxfFile?.name.replace(/\.[^.]+$/, '') ?? 'SXFデータ');
	const selectedLayers = $derived(
		Object.entries(layerChecked)
			.filter(([, checked]) => checked)
			.map(([layer]) => layer)
	);
	const hasSelectableLayers = $derived(
		!!selectedGeometryType && ((layersByGeometryType?.[selectedGeometryType] ?? []).length > 0)
	);
	const isDecisionDisabled = $derived(
		$isProcessing
			|| !selectedGeometryType
			|| rawGeojson === null
			|| (hasSelectableLayers && selectedLayers.length === 0)
	);

	const extractLayer = (props: Record<string, unknown>) =>
		props?.layer != null ? String(props.layer) : undefined;

	const applyLayerSelectionDefaults = () => {
		if (!layersByGeometryType || !selectedGeometryType) {
			layerChecked = {};
			return;
		}

		const names = layersByGeometryType[selectedGeometryType] ?? [];
		layerChecked = Object.fromEntries(names.map((name) => [name, true]));
	};

	$effect(() => {
		if (layersByGeometryType && selectedGeometryType) {
			applyLayerSelectionDefaults();
		}
	});

	const getFilteredGeojson = (geojson: FeatureCollection): FeatureCollection => {
		let filtered = filterByGeometryType(geojson, selectedGeometryType as VectorEntryGeometryType);
		if (hasSelectableLayers && selectedLayers.length > 0) {
			filtered = filterByProperty(filtered, selectedLayers, extractLayer);
		}
		return filtered as FeatureCollection;
	};

	$effect(() => {
		if (!sxfFile) return;

		isProcessing.set(true);
		rawGeojson = null;
		geometryTypeOptions = [];
		selectedGeometryType = '';
		layersByGeometryType = null;
		layerChecked = {};

		sxfFileToGeoJsonInWorker(sxfFile)
			.then((geojson) => {
				rawGeojson = geojson as FeatureCollection;
				const geometryTypes = getGeometryTypes(rawGeojson);

				if (geometryTypes.length === 0) {
					showNotification('SXF から表示できる図形を抽出できませんでした', 'error');
					return;
				}

				if (geometryTypes.length === 1) {
					selectedGeometryType = geometryTypes[0];
					geometryTypeOptions = [];
				} else {
					geometryTypeOptions = geometryTypes.map((geometryType) => ({
						key: geometryType,
						name: GEOMETRY_TYPE_LABELS[geometryType] ?? geometryType
					}));
					selectedGeometryType = geometryTypes[0];
				}

				layersByGeometryType = groupPropertyByGeometryType(rawGeojson, extractLayer);
			})
			.catch((error) => {
				showNotification(
					error instanceof Error ? error.message : 'SXF ファイルの読み込みに失敗しました',
					'error'
				);
				console.error(error);
			})
			.finally(() => {
				isProcessing.set(false);
			});
	});

	const openZoneSelection = () => {
		if (!rawGeojson || !selectedGeometryType) return;

		const filteredGeojson = getFilteredGeojson(rawGeojson);
		if (filteredGeojson.features.length === 0) {
			showNotification('選択した条件に一致する図形がありません', 'error');
			return;
		}

		pendingZoneGeoRefData = {
			featureCollection: filteredGeojson,
			entryName
		};
		transformOptionMode = 'zone';
		focusBbox = turfBbox(filteredGeojson) as [number, number, number, number];
	};

	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!rawGeojson || !selectedGeometryType) return;

		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const transformedGeojson = (await transformGeoJSONParallel(
				rawGeojson,
				prjContent
			)) as FeatureCollection;
			const geojsonData = getFilteredGeojson(transformedGeojson);

			if (geojsonData.features.length === 0) {
				showNotification('SXF ファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const propKeys = Object.keys(geojsonData.features[0]?.properties ?? {});
			const style = buildSxfStyle(geojsonData, selectedGeometryType, propKeys);
			const entry = await createAutoGeoJsonEntry({
				geojson: geojsonData,
				geometryType: selectedGeometryType,
				name: entryName,
				bbox: bbox as [number, number, number, number],
				style,
				attribution: 'SXF',
				allow3d: false
			});

			if (!entry) {
				showNotification('SXF エントリの作成に失敗しました', 'error');
				return;
			}

			showDataEntry = entry;
			showDialogType = null;
			showNotification('SXF ファイルを読み込みました', 'success');
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'SXF ファイルの変換中にエラーが発生しました',
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
		if (zoneConfirmedEpsg && showDialogType === 'sxf') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				transformWithEpsg(epsg);
			});
		}
	});

	const transformWithEpsg = async (epsgCode: EpsgCode) => {
		await convertAndCreateEntry(epsgCode);
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-2">
	<span class="text-2xl font-bold">SXF (SFC) ファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
>
	{#if sxfFile}
		<div class="w-full px-2 text-sm text-gray-300">ファイル: {sxfFile.name}</div>
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

	{#if hasSelectableLayers}
		<div class="w-full px-2">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-300">レイヤー</span>
				<div class="flex gap-2">
					<button
						class="c-btn-sub pointer-events-auto text-xs"
						onclick={applyLayerSelectionDefaults}
					>
						全選択
					</button>
					<button
						class="c-btn-sub pointer-events-auto text-xs"
						onclick={() => {
							const names = layersByGeometryType?.[selectedGeometryType] ?? [];
							layerChecked = Object.fromEntries(names.map((name) => [name, false]));
						}}
					>
						全解除
					</button>
				</div>
			</div>
			<div class="flex flex-col gap-1">
				{#each layersByGeometryType?.[selectedGeometryType] ?? [] as layer (layer)}
					<Checkbox label={layer} bind:value={layerChecked[layer]} />
				{/each}
			</div>
		</div>
	{/if}

	<div class="w-full px-2 text-sm text-gray-400">
		初期対応では線・折線・円・円弧・文字の一部だけを GeoJSON 化して読み込みます。
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={openZoneSelection}
		disabled={isDecisionDisabled}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {isDecisionDisabled
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
