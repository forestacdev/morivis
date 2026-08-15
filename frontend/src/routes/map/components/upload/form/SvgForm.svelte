<script lang="ts">
	import { untrack } from 'svelte';

	import { getAllowedTransformModesForIssue } from '$routes/map/components/upload/transform-policy';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import type { GeoRefData } from '$routes/map/components/upload/form/transform/georef-types';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { svgFileToFeatureCollection } from '$routes/map/utils/formats/svg';
	import { featureCollectionToGeoRefData } from '$routes/map/utils/formats/vector/rasterize';
	import { getDefaultGeoRefCorners } from '$routes/map/utils/transform/georef/default-corners';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { mapStore } from '$routes/stores/map';
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

	let rawGeojson = $state.raw<FeatureCollection | null>(null);
	let analyzing = false;

	const svgFile = $derived.by(() => {
		if (!dropFile) return null;
		return getFirstUploadFile(dropFile);
	});

	const entryName = $derived(svgFile?.name.replace(/\.[^.]+$/, '') ?? 'SVGデータ');
	const getPlacementAllowedTransformModes = () =>
		getAllowedTransformModesForIssue(showDialogType, 'placement-missing');

	const openGeoRef = async (geojson: FeatureCollection) => {
		isProcessing.set(true);

		try {
			const nextGeoRefData = await featureCollectionToGeoRefData({
				featureCollection: geojson,
				entryName
			});
			const map = mapStore.getMap();

			geoRefData = {
				...nextGeoRefData,
				allowedTransformModes: getPlacementAllowedTransformModes(),
				initialCorners: map
					? getDefaultGeoRefCorners(map, nextGeoRefData.imageWidth, nextGeoRefData.imageHeight)
					: nextGeoRefData.initialCorners
			};
			focusBbox = null;
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
			await openGeoRef(geojson);
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
			<div>読み込み方法: 全図形をラインとして GeoRef へ自動遷移</div>
		</div>
	{/if}
	<div class="p-2 text-sm text-gray-400">
		{$isProcessing ? 'SVG を解析中...' : 'GeoRef 画面へ移動します'}
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
</div>
