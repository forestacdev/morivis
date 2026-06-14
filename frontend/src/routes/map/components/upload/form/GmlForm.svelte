<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { gmlFileToGeoJsonInWorker } from '$routes/map/utils/formats/gml/analyze';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
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

	let rawGeojson: FeatureCollection | null = null;
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');

	const gmlFiles = $derived.by(() => {
		if (!dropFile) return [];
		if (dropFile instanceof FileList) return Array.from(dropFile);
		return [dropFile];
	});

	const entryName = $derived(
		gmlFiles.length === 1 ? (gmlFiles[0].name.replace(/\.[^.]+$/, '') ?? 'GMLデータ') : 'GMLデータ'
	);

	/** 複数ファイルをパースしてマージ */
	const parseAllFiles = async (files: File[]): Promise<FeatureCollection> => {
		const results = await Promise.all(files.map((f) => gmlFileToGeoJsonInWorker(f)));
		return {
			type: 'FeatureCollection',
			features: results.flatMap((r) => r.features)
		};
	};

	const createGmlEntry = async (
		geojson: FeatureCollection,
		geometryType: VectorEntryGeometryType,
		bbox: [number, number, number, number]
	) => {
		const entry = await createGeoJsonEntry(geojson, geometryType, entryName, bbox, undefined, {
			attribution: 'GML'
		});

		if (entry && geometryType === 'LineString' && entry.style.type === 'line') {
			entry.style.width.key = '単一';
			entry.style.width.expressions = [
				{
					type: 'single',
					key: '単一',
					name: '単一',
					mapping: {
						value: 1
					}
				}
			];
		}

		return entry;
	};

	// ファイルドロップ時: GML → GeoJSON → ジオメトリタイプ確認
	$effect(() => {
		if (gmlFiles.length > 0) {
			isProcessing.set(true);
			parseAllFiles(gmlFiles)
				.then((geojson) => {
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
				})
				.catch((e) => {
					showNotification('GMLファイルの読み込みに失敗しました', 'error');
					console.error(e);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	const processGeojson = async () => {
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
			pendingZoneGeoRefData = {
				featureCollection: filtered,
				entryName
			};
			transformOptionMode = 'zone';
			focusBbox = bbox as [number, number, number, number];
		} else {
			const entry = await createGmlEntry(
				filtered,
				selectedGeometryType as VectorEntryGeometryType,
				bbox as [number, number, number, number]
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

	// 座標系選択後 → 座標変換してエントリ作成
	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (gmlFiles.length === 0 || !rawGeojson || !selectedGeometryType) return;
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
				showNotification('GMLファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entry = await createGmlEntry(
				geojsonData,
				selectedGeometryType,
				bbox as [number, number, number, number]
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (e) {
			showNotification('GMLファイルの変換中にエラーが発生しました', 'error');
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
		if (zoneConfirmedEpsg && showDialogType === 'gml') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">GMLファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
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
		onclick={processGeojson}
		disabled={$isProcessing || !selectedGeometryType}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!selectedGeometryType
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
