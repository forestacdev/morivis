<script lang="ts">
	import bbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import type { TransformOptionMode } from './pending-zone-vector';
	import type { GeoRefData } from './transform/georef-types';

	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import {
		createGeoJsonEntry,
		filterByGeometryType,
		getGeometryTypes
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { MapInfoResult } from '$routes/map/utils/formats/mapinfo-tab';
	import { runMapInfoWorker } from '$routes/map/utils/formats/mapinfo-tab/analyze';
	import { isMapInfoTab, tabPath } from '$routes/map/utils/formats/mapinfo-tab/files';
	import { featureCollectionToGeoRefData } from '$routes/map/utils/formats/vector/rasterize';
	import type { EpsgCode } from '$routes/map/utils/proj/dict';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		geoRefData: GeoRefData | null;
	}
	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();
	const files = $derived(toUploadFiles(dropFile));
	const tables = $derived(files.filter(isMapInfoTab));
	let selectedIndex = $state(-1);
	const tab = $derived(tables.length === 1 ? tables[0] : tables[selectedIndex]);
	let result = $state.raw<MapInfoResult | null>(null);
	let name = $state('');
	let selectedGeometry = $state<VectorEntryGeometryType>('Point');
	const geometryTypes = $derived(result ? getGeometryTypes(result.geojson) : []);
	const labels: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};
	let loading = $state(false);
	let error = $state('');
	let controller: AbortController | undefined;

	$effect(() => {
		const selected = tab;
		const inputs = files;
		const task = new AbortController();
		controller = task;
		result = null;
		error = '';
		loading = !!selected;
		name = selected?.name.replace(/\.tab$/i, '') ?? '';
		if (selected)
			untrack(() => {
				const release = beginUploadProcessing(task.signal);
				void (async () => {
					try {
						const parsed = await runMapInfoWorker({ files: inputs, tab: selected }, task.signal);
						if (task.signal.aborted) return;
						result = parsed;
						const types = getGeometryTypes(parsed.geojson);
						selectedGeometry = types[0];
						loading = false;
						if (types.length === 1) await register();
					} catch (cause) {
						if (!task.signal.aborted)
							error = cause instanceof Error ? cause.message : 'TABを読み込めませんでした';
					} finally {
						release();
						if (!task.signal.aborted) loading = false;
					}
				})();
			});
		return () => task.abort();
	});

	const selectCrs = () => {
		if (!result || loading) return;
		zoneConfirmedEpsg = null;
		focusBbox = bbox(filterByGeometryType(result.geojson, selectedGeometry)) as [
			number,
			number,
			number,
			number
		];
		transformOptionMode = 'zone';
	};
	const register = async (sourceCrs?: string) => {
		if (!result || !tab || !controller || loading) return;
		if (result.spatialStatus === 'crs-missing' && !sourceCrs) {
			selectCrs();
			return;
		}
		const signal = controller.signal;
		const release = beginUploadProcessing(signal);
		loading = true;
		error = '';
		try {
			const parsed = sourceCrs ? await runMapInfoWorker({ files, tab, sourceCrs }, signal) : result;
			if (signal.aborted) return;
			const geojson = filterByGeometryType(parsed.geojson, selectedGeometry);
			const entry = await createGeoJsonEntry(
				geojson,
				selectedGeometry,
				name.trim() || 'MapInfo TAB',
				bbox(geojson) as [number, number, number, number],
				undefined,
				{ attribution: 'MapInfo TAB' }
			);
			if (signal.aborted) return;
			if (!entry) throw new Error('MapInfoのエントリーを作成できませんでした');
			showDataEntry = entry;
			focusBbox = null;
			transformOptionMode = null;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			if (!signal.aborted)
				error = cause instanceof Error ? cause.message : 'TABを登録できませんでした';
		} finally {
			release();
			if (!signal.aborted) loading = false;
		}
	};
	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'mapinfo-tab') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				transformOptionMode = null;
				void register(`EPSG:${epsg}`);
			});
		}
	});
	const placeManually = async () => {
		if (!result || !controller || loading) return;
		const signal = controller.signal;
		const release = beginUploadProcessing(signal);
		loading = true;
		error = '';
		try {
			const data = await featureCollectionToGeoRefData({
				featureCollection: filterByGeometryType(result.geojson, selectedGeometry),
				entryName: name.trim() || 'MapInfo TAB'
			});
			if (signal.aborted) return;
			data.allowedTransformModes = ['georef'];
			data.vectorAttribution = 'MapInfo TAB';
			geoRefData = data;
			focusBbox = null;
			transformOptionMode = 'georef';
			showDialogType = null;
		} catch (cause) {
			if (!signal.aborted)
				error = cause instanceof Error ? cause.message : '位置合わせを開始できませんでした';
		} finally {
			release();
			if (!signal.aborted) loading = false;
		}
	};
	const cancel = () => {
		controller?.abort();
		dropFile = null;
		showDialogType = null;
		transformOptionMode = null;
		focusBbox = null;
		zoneConfirmedEpsg = null;
	};
</script>

<div class="pb-4 text-2xl font-bold">MapInfo TAB</div>
<div class="flex flex-col gap-4 text-sm">
	<p>TAB・DAT（またはDBF）・MAP・IDを一緒に選択してください。INDも同時に読み込めます。</p>
	<label class="flex flex-col gap-2"
		>ファイル一式を選び直す
		<input
			type="file"
			multiple
			accept=".tab,.dat,.dbf,.map,.id,.ind"
			disabled={loading}
			onchange={(event) => {
				const selected = Array.from(event.currentTarget.files ?? []);
				if (selected.length) {
					selectedIndex = -1;
					dropFile = selected;
				}
			}}
		/>
	</label>
	{#if !tables.length}<p role="alert">TABファイルが必要です。</p>
	{:else if tables.length > 1}
		<label class="flex flex-col gap-2"
			>読み込む表
			<select class="rounded bg-zinc-800 p-2" bind:value={selectedIndex} disabled={loading}>
				<option value={-1} disabled>表を選択してください</option>
				{#each tables as item, index (item)}<option value={index}>{tabPath(item)}</option>{/each}
			</select>
		</label>
	{:else}<p>{tab?.name}</p>{/if}
	{#if result}
		<label class="flex flex-col gap-2"
			>データ名<input class="rounded bg-zinc-800 p-2" bind:value={name} disabled={loading} /></label
		>
		<p>{result.geojson.features.length} 地物</p>
		{#if result.omittedCount}<p>
				図形のない {result.omittedCount} 行は表示対象から除外しました。
			</p>{/if}
		{#if geometryTypes.length > 1}
			<label class="flex flex-col gap-2"
				>図形の種類
				<select class="rounded bg-zinc-800 p-2" bind:value={selectedGeometry} disabled={loading}>
					{#each geometryTypes as type (type)}<option value={type}>{labels[type]}</option>{/each}
				</select>
			</label>
		{/if}
		{#if result.spatialStatus === 'crs-missing'}<p>
				座標系が不明、または自動変換できません。座標系を選ぶか、地図上で位置を合わせてください。
			</p>{/if}
		<div class="flex flex-wrap gap-2">
			<button
				class="c-btn-confirm rounded-lg px-4 py-2"
				disabled={loading}
				onclick={() => register()}>決定</button
			>
			<button class="c-btn-confirm rounded-lg px-4 py-2" disabled={loading} onclick={selectCrs}
				>座標系を選択</button
			>
			<button class="c-btn-confirm rounded-lg px-4 py-2" disabled={loading} onclick={placeManually}
				>位置合わせ</button
			>
		</div>
	{/if}
	{#if loading}<p role="status">MapInfo TABを処理しています…</p>{/if}
	{#if error}<p class="text-red-300" role="alert">{error}</p>{/if}
	<div class="flex justify-end">
		<button class="c-btn-cancel rounded-lg px-4 py-2" onclick={cancel}>キャンセル</button>
	</div>
</div>
