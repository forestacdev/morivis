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
	import {
		simaCsvToGeoJson,
		simaSimpleToGeoJson,
		simaDmToGeoJson,
		simaXmlToGeoJson
	} from '$routes/map/utils/file/sima';
	import { isBboxValid } from '$routes/map/utils/map';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { showNotification } from '$routes/stores/notification';
	import { useEventTrigger } from '$routes/stores/ui';

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

	let loading = $state(false);
	let rawGeojson = $state<FeatureCollection | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<string>('');
	let simaFormat = $state<string>('');

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

	const simaFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	/**
	 * SIMA テキストを自動判別して GeoJSON に変換
	 */
	function parseSimaText(text: string): FeatureCollection {
		const trimmed = text.trim();
		if (trimmed.startsWith('<')) {
			simaFormat = 'SIMA-XML';
			return simaXmlToGeoJson(trimmed);
		} else if (trimmed.startsWith('G00,') || trimmed.startsWith('Z00,')) {
			simaFormat = 'SIMA-CSV';
			return simaCsvToGeoJson(trimmed);
		} else if (trimmed.startsWith('10') || trimmed.startsWith('20') || trimmed.startsWith('30')) {
			simaFormat = 'SIMA-DM';
			return simaDmToGeoJson(trimmed);
		} else {
			simaFormat = 'SIMA-S';
			return simaSimpleToGeoJson(trimmed);
		}
	}

	const extractSimaLayer = (props: Record<string, unknown>) => {
		const v = props?.featureType ?? props?.lineType ?? props?.areaType ?? props?.code;
		return v != null ? String(v) : undefined;
	};

	// ファイルドロップ時: SIMA変換 → ジオメトリタイプ確認
	$effect(() => {
		if (simaFile) {
			loading = true;
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const text = e.target?.result as string;
					const geojson = parseSimaText(text);
					rawGeojson = geojson;
					const types = getGeometryTypes(rawGeojson);

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

					layersByGeometryType = groupPropertyByGeometryType(rawGeojson, extractSimaLayer);
				} catch (err) {
					showNotification('SIMAファイルの読み込みに失敗しました', 'error');
					console.error(err);
				} finally {
					loading = false;
				}
			};
			reader.onerror = () => {
				showNotification('SIMAファイルの読み込みに失敗しました', 'error');
				loading = false;
			};
			reader.readAsText(simaFile);
		}
	});

	// 「決定」→ ZoneFormを表示
	const openZoneForm = () => {
		showZoneForm = true;
		focusBbox = rawGeojson ? (turfBbox(rawGeojson) as [number, number, number, number]) : null;
	};

	// ZoneFormで座標系選択後 → 座標変換してエントリ作成
	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!simaFile || !rawGeojson || !selectedGeometryType) return;
		loading = true;

		try {
			const prjContent = getProjContext(epsgCode);
			const plainGeojson = JSON.parse(JSON.stringify(rawGeojson));

			const geojsonData = (await transformGeoJSONParallel(
				plainGeojson,
				prjContent
			)) as FeatureCollection;

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('SIMAファイルの変換に失敗しました', 'error');
				return;
			}

			let filtered = filterByGeometryType(
				geojsonData,
				selectedGeometryType as VectorEntryGeometryType
			);
			if (selectedLayers.length > 0) {
				filtered = filterByProperty(filtered, selectedLayers, extractSimaLayer);
			}
			const entryGeometryType = geometryTypeToEntryType(filtered);
			if (!entryGeometryType) {
				showNotification('対応していないジオメトリタイプです', 'error');
				return;
			}

			const bbox = turfBbox(filtered);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entry = createGeoJsonEntry(
				filtered,
				entryGeometryType,
				simaFile.name,
				bbox as [number, number, number, number],
				'cad'
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (e) {
			showNotification('SIMAファイルの変換中にエラーが発生しました', 'error');
			console.error(e);
		} finally {
			loading = false;
		}
	};

	const cancel = () => {
		showDialogType = null;
	};

	$effect(() => {
		const unsubscribe = useEventTrigger.subscribe((eventName) => {
			if (eventName === 'setZone' && showDialogType === 'sima') {
				convertAndCreateEntry(selectedEpsgCode);
			}
		});
		return unsubscribe;
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">SIMAファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	{#if simaFormat}
		<div class="w-full px-2 text-sm text-gray-300">
			形式: {simaFormat}
		</div>
	{/if}

	{#if loading}
		<div class="text-sm text-gray-300">変換中...</div>
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

	{#if layersByGeometryType && layersByGeometryType[selectedGeometryType]?.length}
		<div class="w-full px-2">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-300">地物タイプ</span>
				<div class="flex gap-2">
					<button
						class="text-xs text-gray-400 hover:text-white"
						onclick={() => {
							const names = layersByGeometryType?.[selectedGeometryType] ?? [];
							layerChecked = Object.fromEntries(names.map((n) => [n, true]));
						}}>全選択</button
					>
					<button
						class="text-xs text-gray-400 hover:text-white"
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
		disabled={loading || !selectedGeometryType}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {loading || !selectedGeometryType
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
