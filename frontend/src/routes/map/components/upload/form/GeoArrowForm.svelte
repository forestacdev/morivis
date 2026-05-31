<script lang="ts">
	import turfBbox from '@turf/bbox';
	import type { Table } from 'apache-arrow';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { createGeoArrowEntry } from '$routes/map/data/entries/model';
	import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import {
		geoArrowFileToTable,
		getGeoArrowBounds,
		geoArrowTableToGeoJson
	} from '$routes/map/utils/formats/geoarrow';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		showZoneForm: boolean;
		selectedEpsgCode: string;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: string | null;
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

	void selectedEpsgCode;
	void zoneConfirmedEpsg;

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};

	const RENDER_MODE_OPTIONS = [
		{ key: 'deck', name: 'deck.gl' },
		{ key: 'geojson', name: 'GeoJSON' }
	] as const;

	let geoArrowTable = $state<Table | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let selectedRenderMode = $state<'deck' | 'geojson'>('deck');

	const geoArrowFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(geoArrowFile?.name.replace(/\.[^.]+$/, '') ?? 'GeoArrowデータ');

	$effect(() => {
		if (geoArrowFile) {
			isProcessing.set(true);
			geoArrowFileToTable(geoArrowFile)
				.then((result) => {
					geoArrowTable = result.table;

					const types = result.geometryTypes;
					if (types.length === 0) {
						showNotification('有効なジオメトリが見つかりませんでした', 'error');
						dropFile = null;
						showDialogType = null;
						return;
					}

					if (types.length === 1) {
						selectedGeometryType = types[0];
						geometryTypeOptions = [];
					} else {
						geometryTypeOptions = types.map((type) => ({
							key: type,
							name: GEOMETRY_TYPE_LABELS[type] ?? type
						}));
						selectedGeometryType = types[0];
					}
				})
				.catch((error) => {
					showNotification(
						error instanceof Error ? error.message : 'Arrowファイルの読み込みに失敗しました',
						'error'
					);
					console.error(error);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	const processGeoArrow = async () => {
		if (!geoArrowTable || !selectedGeometryType) {
			showNotification('GeoArrow テーブルの読み込みに失敗しました', 'error');
			return;
		}

		const geometryType = selectedGeometryType as VectorEntryGeometryType;
		const bounds = getGeoArrowBounds(geoArrowTable, geometryType);
		let entry: GeoDataEntry | undefined;

		if (selectedRenderMode === 'deck') {
			entry = createGeoArrowEntry(entryName, geoArrowTable, geometryType, bounds ?? undefined);
		} else {
			const geojson = geoArrowTableToGeoJson(geoArrowTable, geometryType);
			if (geojson.features.length === 0) {
				showNotification('GeoJSON に変換できるジオメトリが見つかりませんでした', 'error');
				return;
			}

			const bbox = turfBbox(geojson) as [number, number, number, number];
			entry = await createGeoJsonEntry(geojson, geometryType, entryName, bbox, undefined, {
				attribution: 'GeoArrow'
			});
		}

		if (!entry) {
			showNotification('Arrowファイルの登録に失敗しました', 'error');
			return;
		}

		showDataEntry = entry;
		showDialogType = null;
		showNotification('ファイルを読み込みました', 'success');
	};

		const cancel = () => {
			dropFile = null;
			showDialogType = null;
			showZoneForm = false;
			focusBbox = null;
		};
	</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">Arrowファイルの登録</span>
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

	<div class="w-full p-2">
		<HorizontalSelectBox
			label="描画方式を選択"
			bind:group={selectedRenderMode}
			options={[...RENDER_MODE_OPTIONS]}
		/>
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={processGeoArrow}
		disabled={$isProcessing || !selectedGeometryType}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!selectedGeometryType
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
