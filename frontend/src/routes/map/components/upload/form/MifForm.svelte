<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import DropContainer from '$routes/map/components/DropContainer.svelte';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { mifFilesToGeoJson } from '$routes/map/utils/formats/mif';
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

	void selectedEpsgCode;

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};

	let mifFile = $state<File | null>(null);
	let midFile = $state<File | null>(null);
	let rawGeojson: FeatureCollection<any> | null = null;
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let isDragover = $state(false);
	let shouldAutoProcess = false;

	const entryName = $derived(mifFile?.name.replace(/\.[^.]+$/, '') ?? 'MapInfoデータ');
	const hasFilenameMismatch = $derived.by(() => {
		if (!mifFile || !midFile) return false;
		return mifFile.name.replace(/\.[^.]+$/, '') !== midFile.name.replace(/\.[^.]+$/, '');
	});

	const setFiles = (fileOrFiles: File | FileList | null, autoProcess = false) => {
		if (!fileOrFiles) return;
		const files = fileOrFiles instanceof FileList ? Array.from(fileOrFiles) : [fileOrFiles];
		let hasMifInBatch = false;
		let hasMidInBatch = false;

		for (const file of files) {
			const lowerName = file.name.toLowerCase();
			if (lowerName.endsWith('.mif')) {
				mifFile = file;
				hasMifInBatch = true;
			} else if (lowerName.endsWith('.mid')) {
				midFile = file;
				hasMidInBatch = true;
			}
		}

		shouldAutoProcess = autoProcess && hasMifInBatch && hasMidInBatch;
	};

	$effect(() => {
		if (!dropFile) return;
		setFiles(dropFile, true);
		dropFile = null;
	});

	$effect(() => {
		if (!mifFile || hasFilenameMismatch) return;

		isProcessing.set(true);
		mifFilesToGeoJson(mifFile, midFile)
			.then((geojson) => {
				rawGeojson = geojson as FeatureCollection<any>;

				const types = getGeometryTypes(geojson as FeatureCollection<any>);
				if (types.length === 0) {
					showNotification('有効なジオメトリが見つかりませんでした', 'error');
					return;
				}

				if (types.length === 1) {
					selectedGeometryType = types[0];
					geometryTypeOptions = [];
					if (shouldAutoProcess) {
						processGeojson();
					}
					return;
				}

				geometryTypeOptions = types.map((type) => ({
					key: type,
					name: GEOMETRY_TYPE_LABELS[type] ?? type
				}));
				selectedGeometryType = types[0];
				if (shouldAutoProcess) {
					processGeojson();
				}
			})
			.catch((error) => {
				showNotification(
					error instanceof Error ? error.message : 'MIFファイルの読み込みに失敗しました',
					'error'
				);
				console.error(error);
			})
			.finally(() => {
				isProcessing.set(false);
			});
	});

	const processGeojson = async () => {
		if (!rawGeojson || !selectedGeometryType) {
			showNotification('MIFファイルの読み込みに失敗しました', 'error');
			return;
		}

		const filtered = filterByGeometryType(
			rawGeojson,
			selectedGeometryType as VectorEntryGeometryType
		);
		if (!filtered || filtered.features.length === 0) {
			showNotification('選択したジオメトリタイプのフィーチャが見つかりませんでした', 'error');
			return;
		}

		const bbox = turfBbox(filtered);
		if (!bbox || !isBboxValid(bbox)) {
			showZoneForm = true;
			focusBbox = bbox as [number, number, number, number];
			return;
		}

		const entry = await createGeoJsonEntry(
			filtered,
			selectedGeometryType as VectorEntryGeometryType,
			entryName,
			bbox as [number, number, number, number],
			undefined,
			{ attribution: 'MapInfo MIF' }
		);

		if (!entry) {
			showNotification('MIFファイルの登録に失敗しました', 'error');
			return;
		}

		showDataEntry = entry;
		showDialogType = null;
		showNotification('ファイルを読み込みました', 'success');
	};

	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!rawGeojson || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const transformedGeojson = (await transformGeoJSONParallel(
				rawGeojson,
				prjContent
			)) as FeatureCollection;
			const filtered = filterByGeometryType(
				transformedGeojson,
				selectedGeometryType as VectorEntryGeometryType
			);

			if (!filtered || filtered.features.length === 0) {
				showNotification('MIFファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(filtered);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entry = await createGeoJsonEntry(
				filtered,
				selectedGeometryType,
				entryName,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: 'MapInfo MIF' }
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (error) {
			showNotification('MIFファイルの変換中にエラーが発生しました', 'error');
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
		if (zoneConfirmedEpsg && showDialogType === 'mif') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">MapInfo MIF/MIDファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
>
	<DropContainer class="w-full" bind:isDragover onDropFile={(files) => setFiles(files, true)}>
		<div
			class="w-full rounded-2xl border p-4 text-sm transition-colors {isDragover
				? 'border-main-accent bg-main-accent/10'
				: 'border-white/10 bg-black/10'}"
		>
			<div>MIF: {mifFile?.name ?? '未選択'}</div>
			<div>MID: {midFile?.name ?? '未選択（属性なしでも可）'}</div>
			{#if !midFile}
				<div class="mt-2 text-white/70">
					MID を追加ドロップすると属性も読み込みます。MID なしでもそのまま変換できます。
				</div>
			{/if}
			{#if hasFilenameMismatch}
				<div class="mt-2 text-red-400">MIF と MID のファイル名が一致しません</div>
			{/if}
		</div>
	</DropContainer>

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
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={processGeojson}
		disabled={$isProcessing || !mifFile || !selectedGeometryType || hasFilenameMismatch}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!mifFile ||
		!selectedGeometryType ||
		hasFilenameMismatch
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
