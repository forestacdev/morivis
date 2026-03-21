<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { parseLandXml, type LandXmlSurface, type LandXmlParseResult } from '$routes/map/utils/file/landxml';
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

	type OutputType = 'contour' | 'glb';

	const OUTPUT_TYPE_OPTIONS = [
		{ key: 'contour' as const, name: '等高線 (GeoJSON)' },
		{ key: 'glb' as const, name: '3Dモデル (GLB)' }
	];

	let parseResult = $state<LandXmlParseResult | null>(null);
	let surfaces = $state<LandXmlSurface[]>([]);
	let surfaceOptions = $state<{ key: string; name: string }[]>([]);
	let selectedSurfaceIndex = $state<string>('0');
	let outputType = $state<OutputType>('contour');
	let contourInterval = $state<number>(1);

	// 等高線用
	let rawGeojson = $state<FeatureCollection | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');

	const xmlFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(xmlFile?.name.replace(/\.[^.]+$/, '') ?? 'LandXMLデータ');

	// ファイルドロップ時: パースしてサーフェス一覧取得
	$effect(() => {
		if (xmlFile) {
			isProcessing.set(true);
			parseLandXml(xmlFile, contourInterval)
				.then((result) => {
					parseResult = result;
					surfaces = result.surfaces;

					if (surfaces.length === 1) {
						selectedSurfaceIndex = '0';
						surfaceOptions = [];
					} else {
						surfaceOptions = surfaces.map((s, i) => ({
							key: String(i),
							name: s.name || `Surface ${i + 1}`
						}));
						selectedSurfaceIndex = '0';
					}

					prepareContour(0);
				})
				.catch((e) => {
					showNotification('LandXMLファイルの読み込みに失敗しました', 'error');
					console.error(e);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	const prepareContour = (index: number) => {
		const surface = surfaces[index];
		if (!surface) return;

		// WGS84変換済みがあればそれを使う、なければrawを使う
		const geojson = surface.contourGeojson ?? surface.contourGeojsonRaw;
		if (!geojson) return;

		rawGeojson = geojson;
		const types = getGeometryTypes(geojson);

		if (types.length === 1) {
			selectedGeometryType = types[0];
			geometryTypeOptions = [];
		} else {
			geometryTypeOptions = types.map((t) => ({
				key: t,
				name: t
			}));
			selectedGeometryType = types[0];
		}
	};

	const processContour = () => {
		let filtered = rawGeojson;
		if (rawGeojson && selectedGeometryType) {
			filtered = filterByGeometryType(rawGeojson, selectedGeometryType as VectorEntryGeometryType);
		}

		if (!filtered || filtered.features.length === 0) {
			showNotification('等高線データが見つかりませんでした', 'error');
			return;
		}

		const bbox = turfBbox(filtered);

		if (!bbox || !isBboxValid(bbox)) {
			// 座標変換が必要 → rawを使ってZoneFormへ
			const surface = surfaces[Number(selectedSurfaceIndex)];
			rawGeojson = surface.contourGeojsonRaw;
			showZoneForm = true;
			focusBbox = bbox as [number, number, number, number];
		} else {
			const entry = createGeoJsonEntry(
				filtered,
				selectedGeometryType as VectorEntryGeometryType,
				`${entryName}_contour`,
				bbox as [number, number, number, number],
				'default'
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('等高線を読み込みました', 'success');
			} else {
				showNotification('データが不正です', 'error');
			}
		}
	};

	const processGlb = () => {
		const index = Number(selectedSurfaceIndex);
		const surface = surfaces[index];
		if (!surface) return;

		const blob = new Blob([new Uint8Array(surface.glb)], { type: 'model/gltf-binary' });
		const glbFile = new File([blob], `${entryName}_3d.glb`, { type: 'model/gltf-binary' });

		// GLBファイルとしてGlbFormに渡す
		dropFile = glbFile;
		showDialogType = 'glb';
	};

	const registration = () => {
		if (outputType === 'contour') {
			processContour();
		} else {
			processGlb();
		}
	};

	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!rawGeojson || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const plainGeojson = JSON.parse(JSON.stringify(rawGeojson));

			const transformedGeojson = (await transformGeoJSONParallel(
				plainGeojson,
				prjContent
			)) as FeatureCollection;

			let geojsonData = filterByGeometryType(
				transformedGeojson,
				selectedGeometryType as VectorEntryGeometryType
			);

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entry = createGeoJsonEntry(
				geojsonData,
				selectedGeometryType,
				`${entryName}_contour`,
				bbox as [number, number, number, number],
				'default'
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('等高線を読み込みました', 'success');
			}
		} catch (e) {
			showNotification('変換中にエラーが発生しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		showDialogType = null;
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'landxml') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">LandXMLファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
>
	{#if parseResult && parseResult.detectedZone}
		<div class="w-full p-2 text-sm text-gray-300">
			検出された座標系: 平面直角座標系 第{parseResult.detectedZone}系
			{#if parseResult.isReprojected}
				<span class="text-green-400">(自動変換済み)</span>
			{/if}
		</div>
	{/if}

	{#if surfaceOptions.length > 1}
		<div class="w-full p-2">
			<HorizontalSelectBox
				label="サーフェスを選択"
				bind:group={selectedSurfaceIndex}
				bind:options={surfaceOptions}
			/>
		</div>
	{/if}

	<div class="w-full p-2">
		<HorizontalSelectBox
			label="出力形式"
			bind:group={outputType}
			options={OUTPUT_TYPE_OPTIONS}
		/>
	</div>

	{#if outputType === 'contour'}
		<div class="flex w-full items-center gap-2 p-2">
			<label class="flex grow flex-col gap-1">
				<span class="text-sm text-gray-300">等高線間隔 (m)</span>
				<input
					type="number"
					step="any"
					min="0.1"
					bind:value={contourInterval}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				/>
			</label>
		</div>

		{#if geometryTypeOptions.length > 1}
			<div class="w-full p-2">
				<HorizontalSelectBox
					label="ジオメトリタイプを選択"
					bind:group={selectedGeometryType}
					bind:options={geometryTypeOptions}
				/>
			</div>
		{/if}
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registration}
		disabled={$isProcessing || surfaces.length === 0}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		surfaces.length === 0
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
