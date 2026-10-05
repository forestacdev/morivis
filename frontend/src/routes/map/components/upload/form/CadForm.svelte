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
	import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
	import type { DwgSolidDescriptor, SkippedDwgSolid } from '$routes/map/utils/formats/dwg/acis';
	import { analyzeDwgFileInWorker } from '$routes/map/utils/formats/dwg/analyze';
	import {
		rescaleDxfResult,
		type DxfParseResult,
		type DxfUnit
	} from '$routes/map/utils/formats/dxf';
	import { analyzeDxfFileInWorker } from '$routes/map/utils/formats/dxf/analyze';
	import {
		indexedCadMeshToFeature,
		type IndexedCadMesh
	} from '$routes/map/utils/formats/dxf/indexed-mesh';
	import { convertDxfModelInWorker } from '$routes/map/utils/formats/dxf/mesh-analyze';
	import { prepareDxfVectorData, type DxfRenderMode } from '$routes/map/utils/formats/dxf/planar';
	import { has3dGeometryForType } from '$routes/map/utils/formats/geojson/3d';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		sourceFormat: 'dxf' | 'dwg';
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
		sourceFormat,
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable()
	}: Props = $props();

	const formatLabel = $derived(sourceFormat.toUpperCase());

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};

	const cadFile = $derived.by(() => {
		if (!dropFile) return null;
		return getFirstUploadFile(dropFile);
	});

	let isAnalyzing = $state(false);
	let isConverting = $state(false);
	const isBusy = $derived(isAnalyzing || isConverting || $isProcessing);
	let solidDescriptors = $state.raw<DwgSolidDescriptor[]>([]);
	let inspected = $state.raw<DxfParseResult | null>(null);
	let unitSelection = $state<{ file: File | null; value: DxfUnit }>({ file: null, value: 'auto' });
	const unit = $derived(unitSelection.file === cadFile ? unitSelection.value : 'auto');
	const scaled = $derived(inspected ? rescaleDxfResult(inspected, unit) : null);
	const rawGeojson = $derived(scaled?.geojson ?? null);
	const sourceUnitCode = $derived(inspected?.sourceUnitCode ?? null);
	const georeference = $derived(unit === 'auto' ? inspected?.georeference : undefined);
	const unitResolved = $derived(unit !== 'auto' || sourceUnitCode !== null || !!georeference);
	const dimensions = $derived.by(() => {
		// ソリッドの範囲は三角形化するまで未確定。通常図形だけの範囲を全体として表示しない。
		if (!rawGeojson?.features.length || solidDescriptors.length || !unitResolved) return null;
		const bounds = turfBbox(rawGeojson);
		return `${(bounds[2] - bounds[0]).toLocaleString('ja-JP', { maximumFractionDigits: 3 })} × ${(bounds[3] - bounds[1]).toLocaleString('ja-JP', { maximumFractionDigits: 3 })} m`;
	});
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');

	let layersByGeometryType = $state<Record<string, string[]> | null>(null);
	let layerChecked = $state<Record<string, boolean>>({});
	// ジオメトリタイプ → CADエンティティタイプのマッピング
	let entityTypesByGeometryType = $state<Record<string, string[]>>({});

	const selectedLayers = $derived(
		Object.entries(layerChecked)
			.filter(([, v]) => v)
			.map(([k]) => k)
	);
	const selectedSolidDescriptors = $derived(
		selectedGeometryType === 'Polygon'
			? solidDescriptors.filter((solid) => selectedLayers.includes(solid.layer))
			: []
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
			(selectedSolidDescriptors.length > 0 ||
				has3dGeometryForType(selectedGeojson, 'Polygon') ||
				selectedGeojson.features.some(
					(feature) =>
						feature.geometry.type === 'MultiPolygon' || feature.properties?.type === '3DFACE'
				))
	);
	let renderSelection = $state<{ file: File | null; mode: DxfRenderMode }>({
		file: null,
		mode: 'auto'
	});
	const renderMode = $derived.by(() => {
		const mode = renderSelection.file === cadFile ? renderSelection.mode : 'auto';
		return mode === '2d-line' && selectedGeometryType !== 'Polygon' ? '2d' : mode;
	});
	const useMesh = $derived(canUseMesh && renderMode === 'auto');
	let preparedVectorInput: (ReturnType<typeof prepareDxfVectorData> & { file: File }) | null = null;
	let meshConversion: AbortController | null = null;
	onDestroy(() => meshConversion?.abort());
	const conversionKey = $derived(
		JSON.stringify([unit, selectedGeometryType, [...selectedLayers].sort()])
	);
	let converted = $state.raw<{
		key: string;
		solids: IndexedCadMesh[];
		skipped: SkippedDwgSolid[];
	} | null>(null);
	const skippedSolids = $derived(converted?.key === conversionKey ? converted.skipped : []);
	const nothingConverted = $derived(
		converted?.key === conversionKey &&
			!converted.solids.length &&
			!selectedGeojson?.features.length
	);

	// ジオメトリタイプ変更時にレイヤー一覧を全選択で初期化
	$effect(() => {
		if (layersByGeometryType && selectedGeometryType) {
			const names = layersByGeometryType[selectedGeometryType] ?? [];
			layerChecked = Object.fromEntries(names.map((n) => [n, true]));
		}
	});

	const extractLayer = (props: Record<string, unknown>) =>
		props?.layer != null ? String(props.layer) : undefined;

	// ドロップ時は通常図形とソリッドの一覧だけ読み取る。三角形化は決定時に行う。
	$effect(() => {
		if (cadFile) {
			let active = true;
			const controller = new AbortController();
			const useLocalProgress = sourceFormat === 'dwg';
			isAnalyzing = true;
			if (!useLocalProgress) isProcessing.set(true);
			inspected = null;
			solidDescriptors = [];
			converted = null;
			geometryTypeOptions = [];
			entityTypesByGeometryType = {};
			layerChecked = {};
			preparedVectorInput = null;
			selectedGeometryType = '';
			layersByGeometryType = null;
			(sourceFormat === 'dwg'
				? analyzeDwgFileInWorker(cadFile, 'auto', controller.signal, { mode: 'inspect' })
				: analyzeDxfFileInWorker(cadFile, 'auto').then((result) => ({
						...result,
						skippedSolids: [] as SkippedDwgSolid[],
						solidDescriptors: [] as DwgSolidDescriptor[]
					}))
			)
				.then((result) => {
					if (!active) return;
					solidDescriptors = result.solidDescriptors;
					inspected = result;
					const types = getGeometryTypes(rawGeojson!);
					if (solidDescriptors.length && !types.includes('Polygon')) types.push('Polygon');
					if (!types.length) {
						throw new Error(
							'読み込める図形がありません。対応する面・メッシュを含む図面か確認してください。'
						);
					}

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

					const groups = groupPropertyByGeometryType(rawGeojson!, extractLayer);
					if (solidDescriptors.length)
						groups.Polygon = [
							...new Set([
								...(groups.Polygon ?? []),
								...solidDescriptors.map((solid) => solid.layer)
							])
						];
					layersByGeometryType = groups;

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
					if (solidDescriptors.length) {
						etMap.Polygon ??= new Set();
						for (const solid of solidDescriptors) etMap.Polygon.add(solid.entityType);
					}
					entityTypesByGeometryType = Object.fromEntries(
						Object.entries(etMap).map(([k, v]) => [k, [...v].sort()])
					);
				})
				.catch((e) => {
					if (!active) return;
					showNotification(
						e instanceof Error ? e.message : `${formatLabel}ファイルの読み込みに失敗しました`,
						'error'
					);
					console.error(e);
				})
				.finally(() => {
					if (active) {
						isAnalyzing = false;
						if (!useLocalProgress) isProcessing.set(false);
					}
				});
			return () => {
				active = false;
				controller.abort();
				meshConversion?.abort();
				isAnalyzing = false;
				isConverting = false;
				if (!useLocalProgress) isProcessing.set(false);
			};
		}
	});

	// 未対応部品はこのフォームで確認できるようにし、同じ決定ボタンで残りを読み込む。
	// 再確認時に三角形化を繰り返さない。選択変更時には別の変換結果として扱う。
	const confirmSelection = async () => {
		if (isBusy || !cadFile || !unitResolved || !selectedGeojson || !selectedGeometryType) return;
		const file = cadFile;
		const input = selectedGeojson;
		const key = conversionKey;
		const controller = new AbortController();
		meshConversion?.abort();
		meshConversion = controller;
		isConverting = true;
		if (sourceFormat !== 'dwg') isProcessing.set(true);
		preparedVectorInput = null;
		try {
			let solids: IndexedCadMesh[] = [];
			if (selectedSolidDescriptors.length) {
				if (converted?.key === key) solids = converted.solids;
				else {
					converted = null;
					const result = await analyzeDwgFileInWorker(file, unit, controller.signal, {
						mode: 'convert',
						layers: [...new Set(selectedSolidDescriptors.map((solid) => solid.layer))]
					});
					if (controller.signal.aborted) return;
					solids = result.solids;
					converted = { key, solids, skipped: result.skippedSolids };
					if (result.skippedSolids.length) return;
				}
			}
			if (controller.signal.aborted) return;
			if (!input.features.length && !solids.length) throw new Error('読み込める図形がありません。');
			if (useMesh) {
				const { glb, placement } = await convertDxfModelInWorker(
					input,
					controller.signal,
					solids,
					georeference
				);
				if (controller.signal.aborted) return;
				const modelFile = new File([glb], `${file.name.replace(/\.[^.]+$/, '')}.glb`, {
					type: 'model/gltf-binary'
				});
				if (placement) Object.assign(modelFile, { morivisModelPlacement: placement });
				pendingZoneGeoRefData = null;
				zoneConfirmedEpsg = null;
				focusBbox = null;
				transformOptionMode = null;
				dropFile = [modelFile];
				showDialogType = 'model';
			} else {
				const vectorInput = {
					...input,
					features: [
						...input.features,
						...solids.map((solid) => indexedCadMeshToFeature(solid) as unknown as Feature)
					]
				};
				const prepared = prepareDxfVectorData(vectorInput, selectedGeometryType, renderMode);
				preparedVectorInput = { ...prepared, file };
				pendingZoneGeoRefData = {
					featureCollection: prepared.geojson,
					entryName: file.name.replace(/\.[^.]+$/, '')
				};
				focusBbox = turfBbox(prepared.geojson) as [number, number, number, number];
				if (georeference) {
					pendingZoneGeoRefData = null;
					await convertAndCreateEntry(georeference.epsg);
				} else transformOptionMode = 'zone';
			}
		} catch (error) {
			if (!controller.signal.aborted)
				showNotification(error instanceof Error ? error.message : String(error), 'error');
		} finally {
			if (meshConversion === controller) {
				isConverting = false;
				if (sourceFormat !== 'dwg') isProcessing.set(false);
			}
		}
	};

	// 座標系選択後 → 座標変換してエントリ作成
	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		const input = preparedVectorInput;
		if (!input || input.file !== cadFile || !unitResolved) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const geojsonData = (await transformGeoJSONParallel(
				input.geojson,
				prjContent
			)) as FeatureCollection;
			if (input !== preparedVectorInput || input.file !== cadFile) return;

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
				attribution: formatLabel,
				colorProperty: 'color',
				allow3d: input.allow3d
			});
			if (input !== preparedVectorInput || input.file !== cadFile) return;

			if (entry) {
				showDataEntry = entry;
				dropFile = null;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (e) {
			showNotification(
				e instanceof Error ? e.message : `${formatLabel}ファイルの変換中にエラーが発生しました`,
				'error'
			);
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
		if (zoneConfirmedEpsg && showDialogType === sourceFormat) {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-2">
	<span class="text-2xl font-bold">{formatLabel}ファイルの登録</span>
</div>

<fieldset
	disabled={isBusy}
	class="c-scroll min-h-0 min-w-0 border-0 p-0 flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
>
	<div class="flex w-full flex-col gap-2 px-2">
		<label class="flex flex-col gap-2 text-sm">
			<span>図面の単位</span>
			<select
				class="rounded border border-white/20 bg-[#252525] px-3 py-2"
				value={unit}
				disabled={isBusy}
				onchange={(event) => {
					unitSelection = { file: cadFile, value: event.currentTarget.value as DxfUnit };
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
		{#if georeference}<p class="text-sm text-gray-300">
				座標系: EPSG:{georeference.epsg}（図面の設定から自動配置）
			</p>{/if}
		{#if selectedGeometryType}
			<label class="flex flex-col gap-2 text-sm">
				<span>読み込み方式</span>
				<select
					class="rounded border border-white/20 bg-[#252525] px-3 py-2"
					value={renderMode}
					disabled={isBusy}
					onchange={(event) => {
						renderSelection = { file: cadFile, mode: event.currentTarget.value as DxfRenderMode };
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
				{georeference
					? '図面の座標系を使って3Dモデルを地図へ配置します。'
					: '3Dモデルとして読み込みます。次の画面で地図上の配置位置を調整できます。'}
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
	{#if skippedSolids.length}
		<section
			class="mx-2 min-w-0 self-stretch rounded border border-amber-300/40 bg-amber-300/5 p-3 text-sm text-amber-100"
			aria-label="変換できない部品"
		>
			<p role="status">
				変換できない{skippedSolids.length.toLocaleString('ja-JP')}部品を除外しました。
			</p>
			<p class="mt-1">
				以下の部品は登録されません。{!nothingConverted
					? `残りの図形を読み込むには、もう一度「${useMesh && !georeference ? '3Dモデルの配置へ' : '決定'}」を押してください。`
					: '読み込める図形がありません。'}
			</p>
			<ul class="mt-2 max-h-48 space-y-3 overflow-y-auto break-words">
				{#each skippedSolids as solid, index (index)}
					<li>
						<p>レイヤー: {solid.layer} / {solid.entityType} / ID: {solid.handle}</p>
						{#if solid.blockPath.length}<p>ブロック: {solid.blockPath.join(' → ')}</p>{/if}
						<p>{solid.reason}</p>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
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
</fieldset>

{#if sourceFormat === 'dwg' && (isAnalyzing || isConverting)}
	<p class="px-2 pt-2 text-sm text-gray-300" role="status">
		{isAnalyzing ? 'DWGの図形・レイヤーを読み取っています…' : '選択した図形を変換しています…'}
	</p>
{/if}

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={confirmSelection}
		disabled={isBusy ||
			nothingConverted ||
			!unitResolved ||
			!selectedGeometryType ||
			selectedLayers.length === 0}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {isBusy ||
		nothingConverted ||
		!unitResolved ||
		!selectedGeometryType ||
		selectedLayers.length === 0
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		{useMesh && !georeference ? '3Dモデルの配置へ' : '決定'}
	</button>
</div>
