<script lang="ts">
	import bbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import CadLayerSelect from './CadLayerSelect.svelte';
	import type { PendingZoneGeoRefData, TransformOptionMode } from './pending-zone-vector';
	import type { GeoRefData } from './transform/georef-types';

	import { beginUploadProcessing } from '$routes/map/components/upload/processing-guard';
	import {
		buildDxfStyle,
		createGeoJsonEntry,
		filterByGeometryType,
		getGeometryTypes
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import type { DgnResult } from '$routes/map/utils/formats/dgn';
	import { runDgnWorker } from '$routes/map/utils/formats/dgn/analyze';
	import { featureCollectionToGeoRefData } from '$routes/map/utils/formats/vector/rasterize';
	import type { EpsgCode } from '$routes/map/utils/proj/dict';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		geoRefData: GeoRefData | null;
		pendingZoneGeoRefData: PendingZoneGeoRefData | null;
	}
	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		geoRefData = $bindable(),
		pendingZoneGeoRefData = $bindable()
	}: Props = $props();
	const file = $derived(dropFile ? getFirstUploadFile(dropFile) : null);
	let result = $state.raw<DgnResult | null>(null);
	let name = $state('');
	let selectedGeometry = $state<VectorEntryGeometryType>('Point');
	const geometryTypes = $derived(result ? getGeometryTypes(result.geojson) : []);
	const labels: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};
	let selectedLevels = $state<string[]>([]);
	const levels = $derived(
		result
			? [...new Set(result.geojson.features.map((f) => String(f.properties.layer)))].sort(
					(a, b) => Number(a) - Number(b)
				)
			: []
	);
	const levelItems = $derived(
		levels.map((level) => ({ key: level, name: `レベル ${level}`, detail: '' }))
	);
	const filterSelected = (data: FeatureCollection): FeatureCollection => ({
		type: 'FeatureCollection',
		features: filterByGeometryType(data, selectedGeometry).features.filter((f) =>
			selectedLevels.includes(String(f.properties.layer))
		)
	});
	const selectedData = $derived(result ? filterSelected(result.geojson) : null);
	const styleFor = (data: FeatureCollection) =>
		buildDxfStyle(data, selectedGeometry, [
			...new Set(data.features.flatMap((f) => Object.keys(f.properties)))
		]);
	let loading = $state(false);
	let error = $state('');
	let controller: AbortController | undefined;

	$effect(() => {
		const selected = file;
		const task = new AbortController();
		controller = task;
		result = null;
		pendingZoneGeoRefData = null;
		zoneConfirmedEpsg = null;
		focusBbox = null;
		error = '';
		loading = !!selected;
		name = selected?.name.replace(/\.dgn$/i, '') ?? '';
		if (selected)
			untrack(() => {
				const release = beginUploadProcessing(task.signal);
				void (async () => {
					try {
						const parsed = await runDgnWorker({ file: selected }, task.signal);
						if (task.signal.aborted) return;
						result = parsed;
						const types = getGeometryTypes(parsed.geojson);
						selectedGeometry = types[0];
						loading = false;
						selectedLevels = [
							...new Set(parsed.geojson.features.map((f) => String(f.properties.layer)))
						];
					} catch (cause) {
						if (!task.signal.aborted)
							error = cause instanceof Error ? cause.message : 'DGNを読み込めませんでした';
					} finally {
						release();
						if (!task.signal.aborted) loading = false;
					}
				})();
			});
		return () => task.abort();
	});

	const selectCrs = () => {
		if (!selectedData?.features.length || loading) return;
		zoneConfirmedEpsg = null;
		focusBbox = bbox(selectedData) as [number, number, number, number];
		pendingZoneGeoRefData = {
			featureCollection: selectedData,
			entryName: name,
			vectorStyle: styleFor(selectedData),
			attribution: 'DGN'
		};
		transformOptionMode = 'zone';
	};
	const register = async (sourceCrs?: string) => {
		if (!result || !file || !controller || loading) return;
		if (result.spatialStatus === 'crs-missing' && !sourceCrs) {
			selectCrs();
			return;
		}
		const signal = controller.signal;
		const release = beginUploadProcessing(signal);
		loading = true;
		error = '';
		try {
			const parsed = sourceCrs ? await runDgnWorker({ file, sourceCrs }, signal) : result;
			if (signal.aborted) return;
			const geojson = filterSelected(parsed.geojson);
			if (!geojson.features.length) throw new Error('選択したレベルに図形がありません');
			const entry = await createGeoJsonEntry(
				geojson,
				selectedGeometry,
				name.trim() || 'MicroStation DGN V7',
				bbox(geojson) as [number, number, number, number],
				styleFor(geojson),
				{ attribution: 'MicroStation DGN V7' }
			);
			if (signal.aborted) return;
			if (!entry) throw new Error('DGNのエントリーを作成できませんでした');
			showDataEntry = entry;
			pendingZoneGeoRefData = null;
			focusBbox = null;
			transformOptionMode = null;
			dropFile = null;
			showDialogType = null;
		} catch (cause) {
			if (!signal.aborted)
				error = cause instanceof Error ? cause.message : 'DGNを登録できませんでした';
		} finally {
			release();
			if (!signal.aborted) loading = false;
		}
	};
	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'dgn') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				transformOptionMode = null;
				void register(`EPSG:${epsg}`);
			});
		}
	});
	const placeManually = async () => {
		if (!selectedData?.features.length || !controller || loading) return;
		const signal = controller.signal;
		const release = beginUploadProcessing(signal);
		loading = true;
		error = '';
		try {
			const data = await featureCollectionToGeoRefData({
				featureCollection: selectedData,
				entryName: name.trim() || 'MicroStation DGN V7'
			});
			if (signal.aborted) return;
			data.vectorStyle = styleFor(selectedData);
			data.allowedTransformModes = ['georef'];
			data.vectorAttribution = 'MicroStation DGN V7';
			geoRefData = data;
			pendingZoneGeoRefData = null;
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
		pendingZoneGeoRefData = null;
		dropFile = null;
		showDialogType = null;
		transformOptionMode = null;
		focusBbox = null;
		zoneConfirmedEpsg = null;
	};
</script>

<div class="pb-4 text-2xl font-bold">MicroStation DGN V7</div>
<div class="c-scroll flex flex-col gap-4 overflow-y-auto text-sm">
	<p>
		V7の線・面・文字位置を2Dで読み込みます。V8・参照図面・3Dソリッドの再現には対応していません。
	</p>
	<label class="flex flex-col gap-2"
		>DGNファイル
		<input
			type="file"
			accept=".dgn"
			disabled={loading}
			onchange={(event) => {
				const selected = event.currentTarget.files?.[0];
				if (selected) dropFile = [selected];
			}}
		/>
	</label>
	{#if file}<p>{file.name}</p>{/if}
	{#if result}
		<label class="flex flex-col gap-2"
			>データ名<input class="rounded bg-zinc-800 p-2" bind:value={name} disabled={loading} /></label
		>
		<p>{result.geojson.features.length} 地物</p>
		<p>
			{result.metadata.dimension}D図面 / 主単位: {result.metadata.masterUnit || '未指定'}
			{#if result.metadata.dimension === 3}（高さを除いて2Dで表示）{/if}
		</p>
		{#if result.omittedCount}
			<p>
				未対応の {result.omittedCount} 要素は除外しました（要素種別: {Object.keys(
					result.unsupportedTypes
				).join(', ')}）。
			</p>
		{/if}
		{#if result.approximatedCount}
			<p>B-splineの {result.approximatedCount} 要素は制御点を結ぶ折れ線で表示します。</p>
		{/if}
		{#if geometryTypes.length > 1}
			<label class="flex flex-col gap-2"
				>図形の種類
				<select class="rounded bg-zinc-800 p-2" bind:value={selectedGeometry} disabled={loading}>
					{#each geometryTypes as type (type)}<option value={type}>{labels[type]}</option>{/each}
				</select>
			</label>
		{/if}
		<CadLayerSelect
			label="読み込むレベル"
			items={levelItems}
			bind:selected={selectedLevels}
			disabled={loading}
		/>
		<p>
			図面のマスター単位で座標を読み込みます。座標系の単位と一致することを確認してください。座標系が不明な場合は位置合わせを使えます。
		</p>
		<div class="flex flex-wrap gap-2">
			<button
				class="c-btn-confirm rounded-lg px-4 py-2"
				disabled={loading || !selectedData?.features.length}
				onclick={selectCrs}>座標系を選択</button
			>
			<button
				class="c-btn-confirm rounded-lg px-4 py-2"
				disabled={loading || !selectedData?.features.length}
				onclick={placeManually}>位置合わせ</button
			>
		</div>
	{/if}
	{#if loading}<p role="status">DGNを処理しています…</p>{/if}
	{#if error}<p class="text-red-300" role="alert">{error}</p>{/if}
	<div class="flex justify-end">
		<button class="c-btn-cancel rounded-lg px-4 py-2" onclick={cancel}>キャンセル</button>
	</div>
</div>
