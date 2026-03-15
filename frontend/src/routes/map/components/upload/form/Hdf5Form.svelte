<script lang="ts">
	import turfBbox from '@turf/bbox';

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
	import {
		cprClpToOrbitTrackGeojson,
		cprFmrToOrbitTrackGeojson,
		msiClpToOrbitTrackGeojson,
		getHdf5FileInfo
	} from '$routes/map/utils/file/hdf5';
	import { isBboxValid } from '$routes/map/utils/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン',
		Label: 'ラベル'
	};

	let rawGeojson = $state<FeatureCollection | null>(null);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let productType = $state<string>('');

	const hdf5File = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(hdf5File?.name.replace(/\.[^.]+$/, '') ?? 'HDF5データ');

	const readHdf5 = async (file: File): Promise<FeatureCollection> => {
		if (import.meta.env.MODE !== 'production') {
			const info = await getHdf5FileInfo(file);
			console.log(info);
		}

		if (file.name.includes('ECA_J_CPR_CLP')) {
			productType = 'CPR CLP';
			return cprClpToOrbitTrackGeojson(file);
		} else if (file.name.includes('ECA_E_CPR_FMR')) {
			productType = 'CPR FMR';
			return cprFmrToOrbitTrackGeojson(file);
		} else if (file.name.includes('ECA_J_MSI_CLP')) {
			productType = 'MSI CLP';
			return msiClpToOrbitTrackGeojson(file);
		} else {
			throw new Error('対応していないHDF5プロダクトです');
		}
	};

	// ファイルドロップ時: HDF5 → GeoJSON変換 → ジオメトリタイプ確認
	$effect(() => {
		if (hdf5File) {
			isProcessing.set(true);
			readHdf5(hdf5File)
				.then((geojson) => {
					rawGeojson = geojson;
					const types = getGeometryTypes(rawGeojson);

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
					showNotification(
						e instanceof Error ? e.message : 'HDF5ファイルの読み込みに失敗しました',
						'error'
					);
					console.error(e);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	const processGeojson = () => {
		let filtered = rawGeojson;
		if (rawGeojson && selectedGeometryType) {
			filtered = filterByGeometryType(rawGeojson, selectedGeometryType as VectorEntryGeometryType);
		}

		if (!filtered || filtered.features.length === 0) {
			showNotification('選択したジオメトリタイプのフィーチャが見つかりませんでした', 'error');
			return;
		}

		console.log('Filtered GeoJSON:', filtered);

		const bbox = turfBbox(filtered);

		if (!bbox || !isBboxValid(bbox)) {
			showNotification('座標データが不正です', 'error');
			return;
		}

		const entry = createGeoJsonEntry(
			filtered,
			selectedGeometryType as VectorEntryGeometryType,
			entryName,
			bbox as [number, number, number, number],
			'default'
		);

		if (entry) {
			showDataEntry = entry;
			showDialogType = null;
			showNotification('ファイルを読み込みました', 'success');
		} else {
			showNotification('データが不正です', 'error');
		}
	};

	const cancel = () => {
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">HDF5ファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	{#if productType}
		<div class="w-full px-2 text-sm text-gray-300">
			プロダクト: {productType}
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
