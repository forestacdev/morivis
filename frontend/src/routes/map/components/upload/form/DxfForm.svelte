<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { onDestroy, untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import Checkbox from '$routes/map/components/layer_menu/Checkbox.svelte';
	import { createAutoGeoJsonEntry } from '$routes/map/components/upload/form/geojson-entry';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import {
		getGeometryTypes,
		filterByGeometryType,
		filterByProperty,
		groupPropertyByGeometryType,
		buildDxfStyle
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import type { DxfUnit } from '$routes/map/utils/formats/dxf';
	import { analyzeDxfFileInWorker } from '$routes/map/utils/formats/dxf/analyze';
	import { dxfGeoJsonToGlbInWorker } from '$routes/map/utils/formats/dxf/mesh-analyze';
	import { prepareDxfVectorData, type DxfRenderMode } from '$routes/map/utils/formats/dxf/planar';
	import { has3dGeometryForType } from '$routes/map/utils/formats/geojson/3d';
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

	const dxfFile = $derived.by(() => {
		if (!dropFile) return null;
		return getFirstUploadFile(dropFile);
	});

	let rawGeojson = $state.raw<FeatureCollection | null>(null);
	let unitSelection = $state<{ file: File | null; value: DxfUnit }>({ file: null, value: 'auto' });
	const unit = $derived(unitSelection.file === dxfFile ? unitSelection.value : 'auto');
	let sourceUnitCode = $state<number | null>(null);
	const unitResolved = $derived(unit !== 'auto' || sourceUnitCode !== null);
	const dimensions = $derived.by(() => {
		if (!rawGeojson?.features.length || !unitResolved) return null;
		const bounds = turfBbox(rawGeojson);
		return `${(bounds[2] - bounds[0]).toLocaleString('ja-JP', { maximumFractionDigits: 3 })} × ${(bounds[3] - bounds[1]).toLocaleString('ja-JP', { maximumFractionDigits: 3 })} m`;
	});
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');

	let layersByGeometryType = $state<Record<string, string[]> | null>(null);
	let layerChecked = $state<Record<string, boolean>>({});
	// ジオメトリタイプ → DXFエンティティタイプのマッピング
	let entityTypesByGeometryType = $state<Record<string, string[]>>({});

	const selectedLayers = $derived(
		Object.entries(layerChecked)
			.filter(([, v]) => v)
			.map(([k]) => k)
	);
	const selectedGeojson = $derived.by(() => {
		if (!rawGeojson || !selectedGeometryType) return null;
		return filterByProperty(
			filterByGeometryType(rawGeojson, selectedGeometryType),
			selectedLayers,
			(props) => (props?.layer != null ? String(props.layer) : undefined)
		);
	});
	const canUseMesh = $derived(
		selectedGeometryType === 'Polygon' &&
			selectedGeojson !== null &&
			(has3dGeometryForType(selectedGeojson, 'Polygon') ||
				selectedGeojson.features.some((feature) => feature.geometry.type === 'MultiPolygon'))
	);
	let renderSelection = $state<{ file: File | null; mode: DxfRenderMode }>({
		file: null,
		mode: 'auto'
	});
	const renderMode = $derived.by(() => {
		const mode = renderSelection.file === dxfFile ? renderSelection.mode : 'auto';
		return mode === '2d-line' && selectedGeometryType !== 'Polygon' ? '2d' : mode;
	});
	const useMesh = $derived(canUseMesh && renderMode === 'auto');
	let preparedVectorInput: (ReturnType<typeof prepareDxfVectorData> & { file: File }) | null = null;
	let meshConversion: AbortController | null = null;
	onDestroy(() => meshConversion?.abort());

	// ジオメトリタイプ変更時にレイヤー一覧を全選択で初期化
	$effect(() => {
		if (layersByGeometryType && selectedGeometryType) {
			const names = layersByGeometryType[selectedGeometryType] ?? [];
			layerChecked = Object.fromEntries(names.map((n) => [n, true]));
		}
	});

	const extractLayer = (props: Record<string, unknown>) =>
		props?.layer != null ? String(props.layer) : undefined;

	// ファイルドロップ時: DXF変換 → ジオメトリタイプ確認
	$effect(() => {
		if (dxfFile) {
			let active = true;
			isProcessing.set(true);
			rawGeojson = null;
			preparedVectorInput = null;
			sourceUnitCode = null;
			selectedGeometryType = '';
			layersByGeometryType = null;
			analyzeDxfFileInWorker(dxfFile, unit)
				.then((result) => {
					if (!active) return;
					sourceUnitCode = result.sourceUnitCode;
					rawGeojson = result.geojson;
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

					// ジオメトリタイプ → エンティティタイプのマッピングを構築
					const etMap: Record<string, Set<string>> = {};
					for (const feature of rawGeojson!.features) {
						const props = feature.properties as Record<string, unknown>;
						const et = props?.type != null ? String(props.type) : undefined;
						const geomType = feature.geometry?.type;
						if (!et || !geomType) continue;
						const key =
							geomType === 'Point' || geomType === 'MultiPoint'
								? 'Point'
								: geomType === 'LineString' || geomType === 'MultiLineString'
									? 'LineString'
									: geomType === 'Polygon' || geomType === 'MultiPolygon'
										? 'Polygon'
										: geomType;
						if (!etMap[key]) etMap[key] = new Set();
						etMap[key].add(et);
					}
					entityTypesByGeometryType = Object.fromEntries(
						Object.entries(etMap).map(([k, v]) => [k, [...v].sort()])
					);
				})
				.catch((e) => {
					if (!active) return;
					showNotification('DXFファイルの読み込みに失敗しました', 'error');
					console.error(e);
				})
				.finally(() => {
					if (active) isProcessing.set(false);
				});
			return () => {
				active = false;
				meshConversion?.abort();
				isProcessing.set(false);
			};
		}
	});

	const openModelPlacement = async () => {
		if (!selectedGeojson?.features.length || !dxfFile || !unitResolved || $isProcessing) return;
		const file = dxfFile;
		const input = selectedGeojson;
		const controller = new AbortController();
		meshConversion?.abort();
		meshConversion = controller;
		isProcessing.set(true);
		try {
			const glb = await dxfGeoJsonToGlbInWorker(input, controller.signal);
			if (controller.signal.aborted) return;
			if (selectedGeojson !== input) {
				showNotification('レイヤーの選択が変わりました。もう一度変換してください。', 'warning');
				return;
			}
			const modelFile = new File([glb], `${file.name.replace(/\.[^.]+$/, '')}.glb`, {
				type: 'model/gltf-binary'
			});
			pendingZoneGeoRefData = null;
			zoneConfirmedEpsg = null;
			focusBbox = null;
			transformOptionMode = null;
			dropFile = [modelFile];
			showDialogType = 'model';
		} catch (error) {
			if (!controller.signal.aborted) {
				showNotification(error instanceof Error ? error.message : String(error), 'error');
			}
		} finally {
			if (meshConversion === controller) isProcessing.set(false);
		}
	};

	// 「決定」→ 座標系選択UIを表示
	const openZoneSelection = () => {
		if (!unitResolved || !selectedGeojson || !selectedGeometryType || !dxfFile) return;
		preparedVectorInput = null;
		try {
			const prepared = prepareDxfVectorData(selectedGeojson, selectedGeometryType, renderMode);
			preparedVectorInput = { ...prepared, file: dxfFile };
			pendingZoneGeoRefData = {
				featureCollection: prepared.geojson,
				entryName: dxfFile.name.replace(/\.[^.]+$/, '')
			};
			focusBbox = turfBbox(prepared.geojson) as [number, number, number, number];
			transformOptionMode = 'zone';
		} catch (error) {
			showNotification(error instanceof Error ? error.message : String(error), 'error');
		}
	};

	// 座標系選択後 → 座標変換してエントリ作成
	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		const input = preparedVectorInput;
		if (!input || input.file !== dxfFile || !unitResolved) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const geojsonData = (await transformGeoJSONParallel(
				input.geojson,
				prjContent
			)) as FeatureCollection;
			if (input !== preparedVectorInput || input.file !== dxfFile) return;

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('DXFファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entryName = input.file.name.replace(/\.[^.]+$/, '');
			const propKeys = Object.keys(geojsonData.features[0]?.properties ?? {});
			const style = buildDxfStyle(geojsonData, input.geometryType, propKeys);
			const entry = await createAutoGeoJsonEntry({
				geojson: geojsonData,
				geometryType: input.geometryType,
				name: entryName,
				bbox: bbox as [number, number, number, number],
				style,
				attribution: 'DXF',
				colorProperty: 'color',
				allow3d: input.allow3d
			});
			if (input !== preparedVectorInput || input.file !== dxfFile) return;

			if (entry) {
				showDataEntry = entry;
				dropFile = null;
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
		preparedVectorInput = null;
		meshConversion?.abort();
		dropFile = null;
		showDialogType = null;
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'dxf') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-2">
	<span class="text-2xl font-bold">DXFファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
>
	<div class="flex w-full flex-col gap-2 px-2">
		<label class="flex flex-col gap-2 text-sm">
			<span>図面の単位</span>
			<select
				class="rounded border border-white/20 bg-[#252525] px-3 py-2"
				value={unit}
				disabled={$isProcessing}
				onchange={(event) => {
					unitSelection = { file: dxfFile, value: event.currentTarget.value as DxfUnit };
				}}
			>
				<option value="auto">ファイルの指定を使う</option>
				<option value="mm">ミリメートル（mm）</option>
				<option value="cm">センチメートル（cm）</option>
				<option value="m">メートル（m）</option>
				<option value="in">インチ（in）</option>
				<option value="ft">フィート（ft）</option>
			</select>
		</label>
		{#if rawGeojson && !unitResolved}
			<p class="text-sm text-amber-200" role="status">
				ファイルに単位指定がありません。図面の単位を選択してください。
			</p>
		{:else if dimensions}
			<p class="text-xs text-gray-300">読み込む範囲（X × Y）：{dimensions}</p>
		{/if}
		<p class="text-xs text-gray-400">座標と高さをメートルに換算して読み込みます。</p>
		{#if selectedGeometryType}
			<label class="flex flex-col gap-2 text-sm">
				<span>読み込み方式</span>
				<select
					class="rounded border border-white/20 bg-[#252525] px-3 py-2"
					value={renderMode}
					disabled={$isProcessing}
					onchange={(event) => {
						renderSelection = { file: dxfFile, mode: event.currentTarget.value as DxfRenderMode };
					}}
				>
					<option value="auto">{canUseMesh ? '3Dモデル' : '自動（高さを保持）'}</option>
					<option value="2d">2D{GEOMETRY_TYPE_LABELS[selectedGeometryType]}</option>
					{#if selectedGeometryType === 'Polygon'}<option value="2d-line"
							>2Dライン（面の輪郭）</option
						>{/if}
				</select>
			</label>
		{/if}
		{#if useMesh}
			<p class="text-sm text-gray-300">
				3Dモデルとして読み込みます。次の画面で地図上の配置位置を調整できます。
			</p>
		{:else if renderMode === '2d-line'}
			<p class="text-sm text-gray-300">
				各面の輪郭を真上から見たラインに変換します。面の境界や壁の位置が残ります。
			</p>
		{:else if renderMode === '2d' && selectedGeometryType === 'Polygon'}
			<p class="text-sm text-gray-300">
				各面を真上から見たポリゴンに変換します。垂直な壁面は除外し、重なる面は統合しません。
			</p>
		{:else if renderMode === '2d'}
			<p class="text-sm text-gray-300">高さを除いて2Dレイヤーとして読み込みます。</p>
		{/if}
	</div>
	{#if geometryTypeOptions.length > 1}
		<div class="w-full p-2">
			<HorizontalSelectBox
				label="ジオメトリタイプを選択"
				bind:group={selectedGeometryType}
				bind:options={geometryTypeOptions}
			/>
		</div>

		{#if entityTypesByGeometryType[selectedGeometryType]?.length}
			<div class="flex w-full flex-wrap items-center gap-1 px-2">
				<span class="text-xs text-gray-400">含まれる要素:</span>
				{#each entityTypesByGeometryType[selectedGeometryType] as et (et)}
					<span class="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">{et}</span>
				{/each}
			</div>
		{/if}
	{/if}

	{#if layersByGeometryType && layersByGeometryType[selectedGeometryType]?.length}
		<div class="w-full px-2">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm text-gray-300">レイヤー</span>
				<div class="flex gap-2">
					<button
						class="c-btn-sub pointer-events-auto text-xs"
						onclick={() => {
							const names = layersByGeometryType?.[selectedGeometryType] ?? [];
							layerChecked = Object.fromEntries(names.map((n) => [n, true]));
						}}>全選択</button
					>
					<button
						class="c-btn-sub pointer-events-auto text-xs"
						onclick={() => {
							const names = layersByGeometryType?.[selectedGeometryType] ?? [];
							layerChecked = Object.fromEntries(names.map((n) => [n, false]));
						}}>全解除</button
					>
				</div>
			</div>
			<div class="flex flex-col gap-1">
				{#each layersByGeometryType[selectedGeometryType] as layer (layer)}
					<Checkbox label={layer} bind:value={layerChecked[layer]} />
				{/each}
			</div>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={() => {
			if (useMesh) void openModelPlacement();
			else openZoneSelection();
		}}
		disabled={$isProcessing ||
			!unitResolved ||
			!selectedGeometryType ||
			selectedLayers.length === 0}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!unitResolved ||
		!selectedGeometryType ||
		selectedLayers.length === 0
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		{useMesh ? '3Dモデルの配置へ' : '決定'}
	</button>
</div>
