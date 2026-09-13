<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import CadLayerSelect from './CadLayerSelect.svelte';
	import type { PendingZoneGeoRefData, TransformOptionMode } from './pending-zone-vector';

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
	import type { CedxmResult } from '$routes/map/utils/formats/cedxm';
	import {
		analyzeCedxmFileInWorker,
		cedxmModelToGlbInWorker
	} from '$routes/map/utils/formats/cedxm/analyze';
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
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable()
	}: Props = $props();
	const file = $derived(dropFile ? getFirstUploadFile(dropFile) : null);
	let parsed = $state.raw<CedxmResult | null>(null);
	let renderMode = $state<'2d' | '3d'>('3d');
	let modelConversion: AbortController | null = null;
	let errorMessage = $state('');
	let geometryType = $state<VectorEntryGeometryType>('LineString');
	let selectedLayers = $state<string[]>([]);
	const labels = {
		LineString: '壁・梁・開口など（ライン）',
		Point: '点',
		Polygon: '柱・部屋・屋根など（ポリゴン）'
	};
	const geometryTypes = $derived(parsed ? getGeometryTypes(parsed.geojson) : []);
	const modelSelected = $derived.by((): FeatureCollection | null => {
		if (!parsed) return null;
		const keys = new Set(selectedLayers);
		return {
			type: 'FeatureCollection',
			features: parsed.model.features.filter((feature) =>
				keys.has(String(feature.properties.layer))
			)
		};
	});
	const useModel = $derived(renderMode === '3d');
	const selected = $derived.by((): FeatureCollection | null => {
		if (!parsed) return null;
		const keys = new Set(selectedLayers);
		return {
			type: 'FeatureCollection',
			features: filterByGeometryType(parsed.geojson, geometryType).features.filter((feature) =>
				keys.has(String(feature.properties.layer))
			)
		};
	});
	const selectedData = $derived(useModel ? modelSelected : selected);
	const dimensions = $derived.by(() => {
		if (!selectedData?.features.length) return '';
		const b = turfBbox(selectedData);
		return (
			[b[2] - b[0], b[3] - b[1]]
				.map((value) => value.toLocaleString('ja-JP', { maximumFractionDigits: 3 }))
				.join(' × ') + ' m'
		);
	});
	let pending: {
		data: FeatureCollection;
		geometryType: VectorEntryGeometryType;
		file: File;
	} | null = null;

	// The dropped File is external input. Cancel the worker on replacement or dialog close.
	$effect(() => {
		const currentFile = file;
		if (!currentFile || showDialogType !== 'cedxm') return;
		const controller = new AbortController();
		parsed = null;
		errorMessage = '';
		pending = null;
		isProcessing.set(true);
		void analyzeCedxmFileInWorker(currentFile, controller.signal)
			.then((result) => {
				if (controller.signal.aborted) return;
				parsed = result;
				renderMode = '3d';
				const types = getGeometryTypes(result.geojson);
				geometryType = types.includes('LineString') ? 'LineString' : types[0];
				selectedLayers = result.layers.filter((layer) => layer.visible).map((layer) => layer.key);
			})
			.catch((error) => {
				if (!controller.signal.aborted)
					errorMessage = error instanceof Error ? error.message : String(error);
			})
			.finally(() => {
				if (!controller.signal.aborted) isProcessing.set(false);
			});
		return () => {
			controller.abort();
			modelConversion?.abort();
			pending = null;
			isProcessing.set(false);
		};
	});

	const getStyle = (data: FeatureCollection, type: VectorEntryGeometryType) => {
		const style = buildDxfStyle(data, type, [
			...new Set(data.features.flatMap((feature) => Object.keys(feature.properties)))
		]);
		return style;
	};
	const openPlacement = () => {
		if (useModel) {
			void openModel();
			return;
		}
		if (!selected?.features.length || !file || $isProcessing) return;
		pending = { data: selected, geometryType, file };
		pendingZoneGeoRefData = {
			featureCollection: selected,
			entryName: file.name.replace(/\.[^.]+$/, ''),
			vectorStyle: getStyle(selected, geometryType),
			attribution: 'CEDXM'
		};
		zoneConfirmedEpsg = null;
		focusBbox = turfBbox(selected) as [number, number, number, number];
		transformOptionMode = 'zone';
	};
	const openModel = async () => {
		if (!file || !modelSelected?.features.length || $isProcessing) return;
		const input = modelSelected,
			source = file;
		const controller = new AbortController();
		modelConversion?.abort();
		modelConversion = controller;
		isProcessing.set(true);
		try {
			const glb = await cedxmModelToGlbInWorker(input, controller.signal);
			if (controller.signal.aborted || input !== modelSelected) return;
			pendingZoneGeoRefData = null;
			transformOptionMode = null;
			zoneConfirmedEpsg = null;
			focusBbox = null;
			dropFile = [
				new File([glb], source.name.replace(/\.[^.]+$/, '') + '.glb', { type: 'model/gltf-binary' })
			];
			showDialogType = 'model';
		} catch (error) {
			if (!controller.signal.aborted)
				showNotification(error instanceof Error ? error.message : String(error), 'error');
		} finally {
			if (modelConversion === controller) isProcessing.set(false);
		}
	};
	const register = async (epsg: EpsgCode) => {
		const input = pending;
		if (!input) return;
		isProcessing.set(true);
		try {
			const data = (await transformGeoJSONParallel(
				input.data,
				getProjContext(epsg)
			)) as FeatureCollection;
			if (input !== pending) return;
			const bbox = turfBbox(data) as [number, number, number, number];
			if (!isBboxValid(bbox)) throw new Error('座標変換に失敗しました。座標系を確認してください');
			const entry = await createGeoJsonEntry(
				data,
				input.geometryType,
				input.file.name.replace(/\.[^.]+$/, ''),
				bbox,
				getStyle(data, input.geometryType),
				{ attribution: 'CEDXM' }
			);
			if (input !== pending || !entry) return;
			showDataEntry = entry;
			transformOptionMode = null;
			pendingZoneGeoRefData = null;
			dropFile = null;
			showDialogType = null;
			showNotification('CADファイルを読み込みました', 'success');
		} catch (error) {
			if (input === pending)
				showNotification(error instanceof Error ? error.message : String(error), 'error');
		} finally {
			if (input === pending) isProcessing.set(false);
		}
	};
	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'cedxm') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				void register(epsg);
			});
		}
	});
	const cancel = () => {
		modelConversion?.abort();
		pending = null;
		pendingZoneGeoRefData = null;
		zoneConfirmedEpsg = null;
		transformOptionMode = null;
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="flex min-h-0 w-full flex-col gap-4">
	<div>
		<h2 class="text-xl font-bold">CEDXMの取り込み</h2>
		<p class="mt-1 break-all text-sm text-gray-400">{file?.name ?? ''}</p>
	</div>
	{#if errorMessage}<p role="alert" class="text-sm text-red-400">{errorMessage}</p>{/if}
	{#if parsed}
		<label class="flex flex-col gap-2 text-sm"
			><span>読み込み方式</span>
			<select
				bind:value={renderMode}
				disabled={$isProcessing}
				class="rounded border border-white/20 bg-[#252525] px-3 py-2"
			>
				<option value="3d">3Dモデル（部材ごとの簡易形状）</option><option value="2d">2D図面</option>
			</select>
		</label>
		{#if !useModel}
			<label class="flex flex-col gap-2 text-sm">
				<span>登録する図形</span>
				<select
					bind:value={geometryType}
					disabled={$isProcessing}
					class="rounded border border-white/20 bg-[#252525] px-3 py-2"
				>
					{#each geometryTypes as type (type)}<option value={type}>{labels[type]}</option>{/each}
				</select>
			</label>
		{/if}
		<CadLayerSelect
			label="階 / 部材種別"
			items={parsed.layers.map((layer) => ({
				key: layer.key,
				name: layer.name,
				detail: `${layer.count.toLocaleString()}図形`
			}))}
			bind:selected={selectedLayers}
			disabled={$isProcessing}
		/>
		<p class="text-sm">
			選択中 {selectedData?.features.length.toLocaleString() ?? 0} 図形{dimensions
				? ` · ${dimensions}`
				: ''}
		</p>
		<p class="text-xs leading-relaxed text-gray-400">
			座標・寸法をmmからmへ換算します。3Dは部材ごとのモデル、2Dは選択した図形種別のGeoJSONとして登録します。次の画面で地図上の位置を指定してください。
		</p>
		{#if parsed.warnings.length}
			<ul class="list-inside list-disc text-xs text-amber-300">
				{#each parsed.warnings as warning (warning)}<li>{warning}</li>{/each}
			</ul>
		{/if}
	{:else if $isProcessing}<p role="status" class="text-sm text-gray-400">
			図面を解析しています…
		</p>{/if}
	<div class="flex justify-end gap-3 border-t border-white/10 pt-3">
		<button type="button" class="rounded px-4 py-2 text-sm hover:bg-white/10" onclick={cancel}
			>キャンセル</button
		>
		<button
			type="button"
			class="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-40"
			disabled={$isProcessing || !selectedData?.features.length}
			onclick={openPlacement}>位置を設定して登録</button
		>
	</div>
</div>
