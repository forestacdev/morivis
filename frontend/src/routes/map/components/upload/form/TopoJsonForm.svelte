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
	import { getTopoJsonObjects, topoJsonFileToGeoJson } from '$routes/map/utils/formats/topojson';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
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

	let rawGeojson: FeatureCollection | null = null;
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');

	// TopoJSONオブジェクト選択
	let objectOptions = $state<{ key: string; name: string }[]>([]);
	let selectedObject = $state<string>('');

	const topoFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(topoFile?.name.replace(/\.[^.]+$/, '') ?? 'TopoJSONデータ');

	// ファイルドロップ時: オブジェクト一覧を取得
	$effect(() => {
		if (topoFile) {
			isProcessing.set(true);
			getTopoJsonObjects(topoFile)
				.then((objects) => {
					if (objects.length === 1) {
						// オブジェクトが1つなら即パース
						selectedObject = objects[0].name;
						loadObject(objects[0].name);
					} else {
						objectOptions = objects.map((o) => ({
							key: o.name,
							name: `${o.name} (${o.count}件)`
						}));
						selectedObject = objects[0].name;
					}
				})
				.catch((e) => {
					showNotification('TopoJSONファイルの読み込みに失敗しました', 'error');
					console.error(e);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	/** 選択されたオブジェクトをGeoJSONに変換 */
	const loadObject = async (objectName: string) => {
		if (!topoFile) return;
		isProcessing.set(true);
		try {
			const geojson = await topoJsonFileToGeoJson(topoFile, objectName);
			rawGeojson = geojson as unknown as FeatureCollection;
			const types = getGeometryTypes(rawGeojson!);

			if (types.length === 1) {
				selectedGeometryType = types[0];
				geometryTypeOptions = [];
				processGeojson();
			} else {
				geometryTypeOptions = types.map((t) => ({
					key: t,
					name: GEOMETRY_TYPE_LABELS[t] ?? t
				}));
				selectedGeometryType = types[0];
			}
		} catch (e) {
			showNotification('TopoJSONの変換に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const processGeojson = () => {
		let filtered = rawGeojson;
		if (rawGeojson && selectedGeometryType) {
			filtered = filterByGeometryType(rawGeojson, selectedGeometryType as VectorEntryGeometryType);
		}

		if (!filtered || filtered.features.length === 0) {
			showNotification('選択したジオメトリタイプのフィーチャが見つかりませんでした', 'error');
			return;
		}

		const bbox = turfBbox(filtered);

		if (!bbox || !isBboxValid(bbox)) {
			showZoneForm = true;
			focusBbox = bbox as [number, number, number, number];
		} else {
			const entry = createGeoJsonEntry(
				filtered,
				selectedGeometryType as VectorEntryGeometryType,
				entryName,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: 'TopoJSON' }
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			} else {
				showNotification('データが不正です', 'error');
			}
		}
	};

	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!topoFile || !rawGeojson || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const transformedGeojson = (await transformGeoJSONParallel(
				rawGeojson,
				prjContent
			)) as FeatureCollection;

			let geojsonData = filterByGeometryType(
				transformedGeojson,
				selectedGeometryType as VectorEntryGeometryType
			);

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('TopoJSONファイルの変換に失敗しました', 'error');
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
				entryName,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: 'TopoJSON' }
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (e) {
			showNotification('TopoJSONファイルの変換中にエラーが発生しました', 'error');
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
		if (zoneConfirmedEpsg && showDialogType === 'topojson') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">TopoJSONファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	{#if objectOptions.length > 1}
		<div class="w-full p-2">
			<HorizontalSelectBox
				label="オブジェクトを選択"
				bind:group={selectedObject}
				bind:options={objectOptions}
			/>
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
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={() => {
			if (objectOptions.length > 1 && !rawGeojson) {
				loadObject(selectedObject);
			} else {
				processGeojson();
			}
		}}
		disabled={$isProcessing || (!selectedGeometryType && !selectedObject)}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		(!selectedGeometryType && !selectedObject)
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
