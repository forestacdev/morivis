<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import Checkbox from '$routes/map/components/layer_menu/Checkbox.svelte';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType,
		filterByProperty,
		groupPropertyByGeometryType,
		buildDmStyle
	} from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { convertDMFileToGeoJSON, getDMInfo, type DMInfo } from '$routes/map/utils/file/dm';
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

	let zoneInfo = $state<DMInfo | null>(null);
	// 平面直角座標のままのGeoJSON（座標変換前）
	let rawGeojson: FeatureCollection | null = null;
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	const extractClassName = (props: Record<string, unknown>) =>
		props?.className != null ? String(props.className) : undefined;

	let classNamesByGeometryType = $state<Record<string, string[]> | null>(null);
	let classNameChecked = $state<Record<string, boolean>>({});
	// className → classCode のマッピング
	let classCodeMap = $state<Record<string, string>>({});
	// ジオメトリタイプ → DMデータタイプ（面/線/点/注記等）のマッピング
	let dataTypesByGeometryType = $state<Record<string, string[]>>({});

	// 選択されたclassName一覧（チェック済みのもの）
	const selectedClassNames = $derived(
		Object.entries(classNameChecked)
			.filter(([, v]) => v)
			.map(([k]) => k)
	);

	// ジオメトリタイプ変更時にclassName一覧を全選択で初期化
	$effect(() => {
		if (classNamesByGeometryType && selectedGeometryType) {
			const names = classNamesByGeometryType[selectedGeometryType] ?? [];
			classNameChecked = Object.fromEntries(names.map((n) => [n, true]));
		}
	});

	const dmFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	// ファイルドロップ時: DM変換（座標変換なし）→ ジオメトリタイプ確認
	$effect(() => {
		if (dmFile) {
			isProcessing.set(true);
			getDMInfo(dmFile).then((info) => {
				zoneInfo = info;
				// selectedEpsgCode = String(6668 + info.defaultZone) as EpsgCode;
			});

			convertDMFileToGeoJSON(dmFile, {})
				.then((dmResult) => {
					rawGeojson = dmResult as unknown as FeatureCollection;
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

					classNamesByGeometryType = groupPropertyByGeometryType(rawGeojson, extractClassName);

					// className → classCode のマッピングを構築
					const codeMap: Record<string, string> = {};
					for (const feature of rawGeojson.features) {
						const props = feature.properties as Record<string, unknown>;
						const name = props?.className != null ? String(props.className) : undefined;
						const code = props?.classCode != null ? String(props.classCode) : undefined;
						if (name && code && !codeMap[name]) {
							codeMap[name] = code;
						}
					}
					classCodeMap = codeMap;

					// ジオメトリタイプ → DMデータタイプのマッピングを構築
					const dtMap: Record<string, Set<string>> = {};
					for (const feature of rawGeojson.features) {
						const props = feature.properties as Record<string, unknown>;
						const dt = props?.dataType != null ? String(props.dataType) : undefined;
						const geomType = feature.geometry?.type;
						if (!dt || !geomType) continue;
						const key =
							geomType === 'Point' || geomType === 'MultiPoint'
								? 'Point'
								: geomType === 'LineString' || geomType === 'MultiLineString'
									? 'LineString'
									: geomType === 'Polygon' || geomType === 'MultiPolygon'
										? 'Polygon'
										: geomType;
						if (!dtMap[key]) dtMap[key] = new Set();
						dtMap[key].add(dt);
					}
					dataTypesByGeometryType = Object.fromEntries(
						Object.entries(dtMap).map(([k, v]) => [k, [...v].sort()])
					);
				})
				.catch((e) => {
					showNotification('DMファイルの読み込みに失敗しました', 'error');
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

		// フィルタ結果でbboxを計算（rawGeojsonは上書きしない）
		if (rawGeojson && selectedGeometryType) {
			let filtered = filterByGeometryType(
				rawGeojson,
				selectedGeometryType as VectorEntryGeometryType
			);
			if (selectedClassNames.length > 0) {
				filtered = filterByProperty(filtered, selectedClassNames, extractClassName);
			}
			focusBbox = turfBbox(filtered) as [number, number, number, number];
		} else {
			focusBbox = rawGeojson ? (turfBbox(rawGeojson) as [number, number, number, number]) : null;
		}
	};

	// ZoneFormで座標系選択後 → フィルタ → 座標変換 → エントリ作成
	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!dmFile || !rawGeojson || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode as EpsgCode);

			// ジオメトリタイプ + className でフィルタリングしてから座標変換
			let filtered = filterByGeometryType(
				rawGeojson,
				selectedGeometryType as VectorEntryGeometryType
			);
			if (selectedClassNames.length > 0) {
				filtered = filterByProperty(filtered, selectedClassNames, extractClassName);
			}

			const geojsonData = (await transformGeoJSONParallel(
				filtered,
				prjContent
			)) as FeatureCollection;

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('DMファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。系番号を確認してください', 'error');
				return;
			}

			const entryName = zoneInfo?.drawingName || dmFile.name;
			const propKeys = Object.keys(geojsonData.features[0]?.properties ?? {});
			const style = buildDmStyle(geojsonData, selectedGeometryType, propKeys);
			const entry = createGeoJsonEntry(
				geojsonData,
				selectedGeometryType,
				entryName,
				bbox as [number, number, number, number],
				style,
				{ attribution: 'DM' }
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (e) {
			showNotification('DMファイルの変換中にエラーが発生しました', 'error');
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
		if (zoneConfirmedEpsg && showDialogType === 'dm') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-2">
	<span class="text-2xl font-bold">DMファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
>
	{#if zoneInfo?.drawingName}
		<div class="w-full px-2 text-gray-300">
			図郭名称: {zoneInfo.drawingName}
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

		{#if dataTypesByGeometryType[selectedGeometryType]?.length}
			<div class="flex w-full flex-wrap items-center gap-1 px-2">
				<span class="text-xs text-gray-400">含まれる要素:</span>
				{#each dataTypesByGeometryType[selectedGeometryType] as dt}
					<span class="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">{dt}</span>
				{/each}
			</div>
		{/if}
	{/if}

	{#if classNamesByGeometryType && classNamesByGeometryType[selectedGeometryType]?.length}
		<div class="w-full px-2">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-300">クラス名</span>
				<div class="flex gap-2">
					<button
						class="c-btn-sub pointer-events-auto cursor-pointer text-xs"
						onclick={() => {
							const names = classNamesByGeometryType?.[selectedGeometryType] ?? [];
							classNameChecked = Object.fromEntries(names.map((n) => [n, true]));
						}}>全選択</button
					>
					<button
						class="c-btn-sub pointer-events-auto cursor-pointer text-xs"
						onclick={() => {
							const names = classNamesByGeometryType?.[selectedGeometryType] ?? [];
							classNameChecked = Object.fromEntries(names.map((n) => [n, false]));
						}}>全解除</button
					>
				</div>
			</div>
			<div class="flex flex-col gap-1">
				{#each [...classNamesByGeometryType[selectedGeometryType]].sort((a, b) => {
					const codeA = parseInt(classCodeMap[a] ?? '9999', 10);
					const codeB = parseInt(classCodeMap[b] ?? '9999', 10);
					return codeA - codeB;
				}) as className}
					<Checkbox
						label={classCodeMap[className]
							? `${className} (${classCodeMap[className]})`
							: className}
						bind:value={classNameChecked[className]}
					/>
				{/each}
			</div>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={openZoneForm}
		disabled={$isProcessing || !selectedGeometryType || selectedClassNames.length === 0}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!selectedGeometryType ||
		selectedClassNames.length === 0
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
