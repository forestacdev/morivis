<script lang="ts">
	import turfBbox from '@turf/bbox';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import { geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import {
		convertDMFileToGeoJSON,
		getDMZoneInfo,
		type DMZoneInfo
	} from '$routes/map/utils/file/dm';
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

	let zoneInfo = $state<DMZoneInfo | null>(null);
	let loading = $state(false);
	// 平面直角座標のままのGeoJSON（座標変換前）
	let rawGeojson = $state<FeatureCollection | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<string>('');
	const dmFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	// ファイルドロップ時: DM変換（座標変換なし）→ ジオメトリタイプ確認
	$effect(() => {
		if (dmFile) {
			loading = true;
			getDMZoneInfo(dmFile).then((info) => {
				zoneInfo = info;
				selectedEpsgCode = String(6668 + info.defaultZone) as EpsgCode;
			});

			convertDMFileToGeoJSON(dmFile, { zoneNumber: 2 })
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
				})
				.catch((e) => {
					showNotification('DMファイルの読み込みに失敗しました', 'error');
					console.error(e);
				})
				.finally(() => {
					loading = false;
				});
		}
	});

	// 「決定」→ ZoneFormを表示
	const openZoneForm = () => {
		showZoneForm = true;
		focusBbox = rawGeojson ? (turfBbox(rawGeojson) as [number, number, number, number]) : null;
	};

	// ZoneFormで座標系選択後 → 座標変換してエントリ作成
	const convertAndCreateEntry = async (zoneNumber: number) => {
		if (!dmFile || !selectedGeometryType) return;
		loading = true;

		try {
			const dmResult = await convertDMFileToGeoJSON(dmFile, { zoneNumber });
			const prjContent = getProjContext(
				String(dmResult.properties?.epsgCode ?? 6668 + zoneNumber) as EpsgCode
			);

			const geojsonData = (await transformGeoJSONParallel(
				dmResult as any,
				prjContent
			)) as FeatureCollection;

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('DMファイルの変換に失敗しました', 'error');
				return;
			}

			const filtered = filterByGeometryType(
				geojsonData,
				selectedGeometryType as VectorEntryGeometryType
			);
			const entryGeometryType = geometryTypeToEntryType(filtered);
			if (!entryGeometryType) {
				showNotification('対応していないジオメトリタイプです', 'error');
				return;
			}

			const bbox = turfBbox(filtered);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。系番号を確認してください', 'error');
				return;
			}

			const entry = createGeoJsonEntry(
				filtered,
				entryGeometryType,
				dmFile.name,
				bbox as [number, number, number, number],
				'cad'
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
			loading = false;
		}
	};

	const cancel = () => {
		showDialogType = null;
	};

	useEventTrigger.subscribe((eventName) => {
		if (eventName === 'setZone' && showDialogType === 'dm') {
			const zoneNumber = Number(selectedEpsgCode) - 6668;
			if (zoneNumber >= 1 && zoneNumber <= 19) {
				convertAndCreateEntry(zoneNumber);
			}
		}
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
