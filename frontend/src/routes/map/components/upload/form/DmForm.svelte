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
	import { convertDMFileToGeoJSON, getDMInfo, type DMInfo } from '$routes/map/utils/file/dm';
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

	let zoneInfo = $state<DMInfo | null>(null);
	// 平面直角座標のままのGeoJSON（座標変換前）
	let rawGeojson = $state<FeatureCollection | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	const extractClassName = (props: Record<string, unknown>) =>
		props?.className != null ? String(props.className) : undefined;

	let classNamesByGeometryType = $state<Record<string, string[]> | null>(null);
	let classNameChecked = $state<Record<string, boolean>>({});

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

			const plainGeojson = JSON.parse(JSON.stringify(filtered));

			const geojsonData = (await transformGeoJSONParallel(
				plainGeojson,
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
			const entry = createGeoJsonEntry(
				geojsonData,
				selectedGeometryType,
				entryName,
				bbox as [number, number, number, number],
				'dm'
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
		showDialogType = null;
	};

	$effect(() => {
		const unsubscribe = useEventTrigger.subscribe((eventName) => {
			if (eventName === 'setZone' && showDialogType === 'dm') {
				convertAndCreateEntry(selectedEpsgCode);
			}
		});
		return unsubscribe;
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">DMファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	{#if zoneInfo?.drawingName}
		<div class="w-full px-2 text-sm text-gray-300">
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
	{/if}

	{#if classNamesByGeometryType && classNamesByGeometryType[selectedGeometryType]?.length}
		<div class="w-full px-2">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-300">クラス名</span>
				<div class="flex gap-2">
					<button
						class="pointer-events-auto text-xs text-gray-400 hover:text-white"
						onclick={() => {
							const names = classNamesByGeometryType?.[selectedGeometryType] ?? [];
							classNameChecked = Object.fromEntries(names.map((n) => [n, true]));
						}}>全選択</button
					>
					<button
						class="pointer-events-auto text-xs text-gray-400 hover:text-white"
						onclick={() => {
							const names = classNamesByGeometryType?.[selectedGeometryType] ?? [];
							classNameChecked = Object.fromEntries(names.map((n) => [n, false]));
						}}>全解除</button
					>
				</div>
			</div>
			<div class="flex flex-col gap-1">
				{#each classNamesByGeometryType[selectedGeometryType] as className}
					<Checkbox label={className} bind:value={classNameChecked[className]} />
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
