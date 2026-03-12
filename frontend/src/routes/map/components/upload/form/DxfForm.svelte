<script lang="ts">
	import turfBbox from '@turf/bbox';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import Checkbox from '$routes/map/components/layer_menu/Checkbox.svelte';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType,
		filterByProperty,
		groupPropertyByGeometryType
	} from '$routes/map/data/entries/vector';
	import { geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { dxfFileToGeoJsonBrowser } from '$routes/map/utils/file/dxf';
	import { isBboxValid } from '$routes/map/utils/map';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing, useEventTrigger } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		showZoneForm = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable()
	}: Props = $props();

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン',
		Label: 'ラベル'
	};

	let rawGeojson = $state<FeatureCollection | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');

	let layersByGeometryType = $state<Record<string, string[]> | null>(null);
	let layerChecked = $state<Record<string, boolean>>({});

	const selectedLayers = $derived(
		Object.entries(layerChecked)
			.filter(([, v]) => v)
			.map(([k]) => k)
	);

	// ジオメトリタイプ変更時にレイヤー一覧を全選択で初期化
	$effect(() => {
		if (layersByGeometryType && selectedGeometryType) {
			const names = layersByGeometryType[selectedGeometryType] ?? [];
			layerChecked = Object.fromEntries(names.map((n) => [n, true]));
		}
	});

	const dxfFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const extractLayer = (props: Record<string, unknown>) =>
		props?.layer != null ? String(props.layer) : undefined;

	// ファイルドロップ時: DXF変換 → ジオメトリタイプ確認
	$effect(() => {
		if (dxfFile) {
			isProcessing.set(true);
			dxfFileToGeoJsonBrowser(dxfFile)
				.then((geojson) => {
					rawGeojson = geojson as unknown as FeatureCollection;
					const types = getGeometryTypes(rawGeojson!);

					if (types.length === 1) {
						selectedGeometryType = types[0];
						geometryTypeOptions = [];
					} else {
						geometryTypeOptions = types.map((t) => ({
							key: t,
							name: GEOMETRY_TYPE_LABELS[t] ?? t
						}));
						selectedGeometryType = types[0];
					}

					layersByGeometryType = groupPropertyByGeometryType(rawGeojson!, extractLayer);
				})
				.catch((e) => {
					showNotification('DXFファイルの読み込みに失敗しました', 'error');
					console.error(e);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	// 「決定」→ ZoneFormを表示
	const openZoneForm = () => {
		showZoneForm = true;
		if (rawGeojson && selectedGeometryType) {
			let filtered = filterByGeometryType(
				rawGeojson,
				selectedGeometryType as VectorEntryGeometryType
			);
			if (selectedLayers.length > 0) {
				filtered = filterByProperty(filtered, selectedLayers, extractLayer);
			}
			focusBbox = turfBbox(filtered) as [number, number, number, number];
		} else {
			focusBbox = rawGeojson ? (turfBbox(rawGeojson) as [number, number, number, number]) : null;
		}
	};

	// ZoneFormで座標系選択後 → 座標変換してエントリ作成
	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!dxfFile || !rawGeojson || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const plainGeojson = JSON.parse(JSON.stringify(rawGeojson));

			const transformedGeojson = (await transformGeoJSONParallel(
				plainGeojson,
				prjContent
			)) as FeatureCollection;

			// ジオメトリタイプとレイヤーでフィルター
			let geojsonData = filterByGeometryType(
				transformedGeojson,
				selectedGeometryType as VectorEntryGeometryType
			);
			if (selectedLayers.length > 0) {
				geojsonData = filterByProperty(geojsonData, selectedLayers, extractLayer);
			}

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('DXFファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entryName = dxfFile.name.replace(/\.[^.]+$/, '');
			const entry = createGeoJsonEntry(
				geojsonData,
				selectedGeometryType,
				entryName,
				bbox as [number, number, number, number],
				'dxf'
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (e) {
			showNotification('DXFファイルの変換中にエラーが発生しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		showDialogType = null;
	};

	$effect(() => {
		const unsubscribe = useEventTrigger.subscribe((eventName) => {
			if (eventName === 'setZone' && showDialogType === 'dxf') {
				convertAndCreateEntry(selectedEpsgCode);
			}
		});
		return unsubscribe;
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">DXFファイルの登録</span>
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

	{#if layersByGeometryType && layersByGeometryType[selectedGeometryType]?.length}
		<div class="w-full px-2">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-300">レイヤー</span>
				<div class="flex gap-2">
					<button
						class="pointer-events-auto text-xs text-gray-400 hover:text-white"
						onclick={() => {
							const names = layersByGeometryType?.[selectedGeometryType] ?? [];
							layerChecked = Object.fromEntries(names.map((n) => [n, true]));
						}}>全選択</button
					>
					<button
						class="pointer-events-auto text-xs text-gray-400 hover:text-white"
						onclick={() => {
							const names = layersByGeometryType?.[selectedGeometryType] ?? [];
							layerChecked = Object.fromEntries(names.map((n) => [n, false]));
						}}>全解除</button
					>
				</div>
			</div>
			<div class="flex flex-col gap-1">
				{#each layersByGeometryType[selectedGeometryType] as layer}
					<Checkbox label={layer} bind:value={layerChecked[layer]} />
				{/each}
			</div>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={openZoneForm}
		disabled={$isProcessing || !selectedGeometryType}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!selectedGeometryType
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
