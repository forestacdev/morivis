<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import type { GeoRefData } from '$routes/map/components/upload/form/transform/georef-types';
	import {
		filterByGeometryType,
		getGeometryTypes
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { svgFileToFeatureCollection } from '$routes/map/utils/formats/svg';
	import { featureCollectionToGeoRefData } from '$routes/map/utils/formats/vector/rasterize';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		focusBbox: [number, number, number, number] | null;
		geoRefData: GeoRefData | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		focusBbox = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};

	let rawGeojson = $state.raw<FeatureCollection | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let analyzing = false;

	const svgFile = $derived.by(() => {
		if (!dropFile) return null;
		return getFirstUploadFile(dropFile);
	});

	const entryName = $derived(svgFile?.name.replace(/\.[^.]+$/, '') ?? 'SVGデータ');

	const analyzeSvg = async (file: File) => {
		if (analyzing) return;
		analyzing = true;
		isProcessing.set(true);

		try {
			const geojson = await svgFileToFeatureCollection(file);
			if (geojson.features.length === 0) {
				showNotification('SVG から読み込める図形が見つかりませんでした', 'error');
				return;
			}

			rawGeojson = geojson;
			const types = getGeometryTypes(geojson);
			geometryTypeOptions = types.map((type) => ({
				key: type,
				name: GEOMETRY_TYPE_LABELS[type] ?? type
			}));
			selectedGeometryType = types[0] ?? '';
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'SVGファイルの読み込みに失敗しました',
				'error'
			);
			console.error(error);
		} finally {
			isProcessing.set(false);
			analyzing = false;
		}
	};

	const openGeoRef = async () => {
		if (!rawGeojson || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const filtered = filterByGeometryType(rawGeojson, selectedGeometryType);
			if (filtered.features.length === 0) {
				showNotification('選択した図形種別が見つかりませんでした', 'error');
				return;
			}

			const bbox = turfBbox(filtered) as [number, number, number, number];
			if (!isBboxValid(bbox)) {
				showNotification('SVG の範囲計算に失敗しました', 'error');
				return;
			}

			geoRefData = await featureCollectionToGeoRefData({
				featureCollection: filtered,
				entryName
			});
			focusBbox = bbox;
			transformOptionMode = 'georef';
			showDialogType = null;
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'SVG の GeoRef 準備に失敗しました',
				'error'
			);
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};

	$effect(() => {
		if (svgFile && !rawGeojson && !analyzing) {
			untrack(() => {
				analyzeSvg(svgFile);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-2">
	<span class="text-2xl font-bold">SVGファイルの登録</span>
</div>

<div class="c-scroll flex h-full w-full grow flex-col gap-4 overflow-x-hidden overflow-y-auto p-2">
	{#if svgFile}
		<div class="rounded bg-black/20 p-3 text-sm text-gray-200">
			<div>ファイル: {svgFile.name}</div>
			<div>読み込み方法: ベクターレイヤーとして GeoRef</div>
		</div>
	{/if}

	{#if geometryTypeOptions.length > 1}
		<HorizontalSelectBox
			label="ジオメトリタイプを選択"
			bind:group={selectedGeometryType}
			bind:options={geometryTypeOptions}
		/>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={openGeoRef}
		disabled={$isProcessing || !rawGeojson || !selectedGeometryType}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!rawGeojson ||
		!selectedGeometryType
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
