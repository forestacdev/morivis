<script lang="ts">
	import turfBbox from '@turf/bbox';

	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import { geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import {
		convertDMFileToGeoJSON,
		getDMZoneInfo,
		ZONE_REGIONS,
		type DMZoneInfo
	} from '$routes/map/utils/file/dm';
	import { isBboxValid } from '$routes/map/utils/map';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	let selectedZone = $state<number>(2);
	let zoneInfo = $state<DMZoneInfo | null>(null);
	let loading = $state(false);

	const dmFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	$effect(() => {
		if (dmFile) {
			getDMZoneInfo(dmFile).then((info) => {
				zoneInfo = info;
				selectedZone = info.defaultZone;
			});
		}
	});

	const registration = async () => {
		console.log('DMファイルの登録を開始', { dmFile, selectedZone });
		if (!dmFile) return;
		loading = true;

		try {
			const dmResult = await convertDMFileToGeoJSON(dmFile, {
				zoneNumber: selectedZone
			});
			const prjContent = getProjContext(
				String(dmResult.properties?.epsgCode ?? 6668 + selectedZone) as EpsgCode
			);

			let geojsonData = (await transformGeoJSONParallel(
				dmResult as any,
				prjContent
			)) as FeatureCollection;

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('DMファイルの変換に失敗しました', 'error');
				return;
			}

			const checkGeometryTypes = getGeometryTypes(geojsonData);
			if (checkGeometryTypes.length > 1) {
				geojsonData = filterByGeometryType(geojsonData, checkGeometryTypes[0]);
			}

			const entryGeometryType = geometryTypeToEntryType(geojsonData);
			if (!entryGeometryType) {
				showNotification('対応していないジオメトリタイプです', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。系番号を確認してください', 'error');
				return;
			}

			const entry = createGeoJsonEntry(
				geojsonData,
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
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">DMファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
>
	{#if zoneInfo?.drawingName}
		<div class="w-full px-2 text-sm text-gray-300">
			図郭名称: {zoneInfo.drawingName}
		</div>
	{/if}

	{#if zoneInfo?.indexZone}
		<div class="w-full px-2 text-sm text-green-400">
			INDEXレコードから系番号 {zoneInfo.indexZone} を検出しました
		</div>
	{/if}

	<div class="flex w-full flex-col gap-2 px-2">
		<label for="zone-select" class="text-base select-none">平面直角座標系の系番号</label>
		<select
			id="zone-select"
			bind:value={selectedZone}
			class="bg-sub border-sub w-full rounded-md border p-3 text-base text-white"
		>
			{#each Array.from({ length: 19 }, (_, i) => i + 1) as zone}
				<option value={zone}>
					{zone}系 — {ZONE_REGIONS[zone] ?? ''}
				</option>
			{/each}
		</select>
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registration}
		disabled={loading}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg"
	>
		{loading ? '変換中...' : '決定'}
	</button>
</div>
