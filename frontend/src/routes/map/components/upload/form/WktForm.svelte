<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import WktGeometryTypeForm from '$routes/map/components/upload/form/WktGeometryTypeForm.svelte';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { WktParseError, wktFileToGeojson, wktTextToGeojson } from '$routes/map/utils/formats/wkt';
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
		Polygon: 'ポリゴン'
	};

	let rawGeojson = $state<FeatureCollection | null>(null);
	let sourceEpsgCode = $state<EpsgCode | null>(null);
	let sourceMode = $state<'file' | 'text'>('file');
	let inputText = $state('');
	let manualEntryName = $state('WKTデータ');
	let fileInput = $state<HTMLInputElement | null>(null);
	let isDragover = $state(false);
	let showGeometryTypeDialog = $state(false);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');

	const wktFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(
		sourceMode === 'text'
			? manualEntryName.trim() || 'WKTデータ'
			: (wktFile?.name.replace(/\.[^.]+$/, '') ?? 'WKTデータ')
	);

	const createEntry = async (
		geojson: FeatureCollection,
		geometryType: VectorEntryGeometryType,
		bbox: [number, number, number, number]
	) => {
		return createGeoJsonEntry(geojson, geometryType, entryName, bbox, undefined, {
			attribution: 'WKT'
		});
	};

	const setSelectedFile = (file: File) => {
		dropFile = file;
		rawGeojson = null;
		sourceEpsgCode = null;
		showGeometryTypeDialog = false;
		geometryTypeOptions = [];
		selectedGeometryType = '';
	};

	const prepareWkt = async (geojson: FeatureCollection, epsgCode: EpsgCode | null) => {
		let nextGeojson = geojson;
		sourceEpsgCode = epsgCode;

		if (epsgCode && epsgCode !== '4326') {
			const prjContent = getProjContext(epsgCode);
			nextGeojson = (await transformGeoJSONParallel(geojson, prjContent)) as FeatureCollection;
			sourceEpsgCode = '4326';
		}

		rawGeojson = nextGeojson;
		const types = getGeometryTypes(nextGeojson);

		geometryTypeOptions = types.map((type) => ({
			key: type,
			name: GEOMETRY_TYPE_LABELS[type] ?? type
		}));
		selectedGeometryType = types[0];
		showGeometryTypeDialog = false;

		if (types.length === 1) {
			await processWkt();
			return;
		}

		showGeometryTypeDialog = true;
		showNotification('複数のジオメトリタイプが見つかりました。読み込むタイプを選択してください', 'info');
	};

	$effect(() => {
		if (!wktFile || sourceMode !== 'file') return;

		isProcessing.set(true);
		wktFileToGeojson(wktFile)
			.then(async ({ geojson, epsgCode }) => {
				await prepareWkt(geojson, epsgCode);
			})
			.catch((error) => {
				showNotification(
					error instanceof WktParseError ? error.message : 'WKTファイルの読み込みに失敗しました',
					'error'
				);
				console.error(error);
			})
			.finally(() => {
				isProcessing.set(false);
			});
	});

	const processWkt = async () => {
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
			return;
		}

		const entry = await createEntry(
			filtered,
			selectedGeometryType as VectorEntryGeometryType,
			bbox as [number, number, number, number]
		);

		if (!entry) {
			showNotification('データが不正です', 'error');
			return;
		}

		showDataEntry = entry;
		dropFile = null;
		showGeometryTypeDialog = false;
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
			const geojsonData = filterByGeometryType(
				transformedGeojson,
				selectedGeometryType as VectorEntryGeometryType
			);

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('WKTファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entry = await createEntry(
				geojsonData,
				selectedGeometryType,
				bbox as [number, number, number, number]
			);

			if (entry) {
				showDataEntry = entry;
				dropFile = null;
				showGeometryTypeDialog = false;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (error) {
			showNotification('WKTファイルの変換中にエラーが発生しました', 'error');
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showGeometryTypeDialog = false;
		showDialogType = null;
	};

	const backToWktInput = () => {
		showGeometryTypeDialog = false;
	};

	const loadFromText = async () => {
		if (!inputText.trim()) {
			showNotification('WKTテキストを入力してください', 'error');
			return;
		}

		isProcessing.set(true);
		try {
			const { geojson, epsgCode } = wktTextToGeojson(inputText, entryName);
			await prepareWkt(geojson, epsgCode);
		} catch (error) {
			showNotification(
				error instanceof WktParseError ? error.message : 'WKTテキストの読み込みに失敗しました',
				'error'
			);
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const submit = async () => {
		if (showGeometryTypeDialog) {
			await processWkt();
			return;
		}

		if (rawGeojson && selectedGeometryType) {
			await processWkt();
			return;
		}

		if (sourceMode === 'text') {
			await loadFromText();
			return;
		}

		await processWkt();
	};

	const openFilePicker = () => {
		fileInput?.click();
	};

	const onFileChange = (event: Event) => {
		const files = (event.currentTarget as HTMLInputElement).files;
		const file = files?.[0];
		if (!file) return;
		setSelectedFile(file);
	};

	const onDropFile = (event: DragEvent) => {
		event.preventDefault();
		isDragover = false;
		const file = event.dataTransfer?.files?.[0];
		if (!file) return;
		setSelectedFile(file);
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'wkt') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

{#if showGeometryTypeDialog}
	<WktGeometryTypeForm
		bind:selectedGeometryType
		{geometryTypeOptions}
		{sourceEpsgCode}
		onBack={backToWktInput}
		onCancel={cancel}
		onConfirm={submit}
	/>
{:else}
	<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
		<span class="text-2xl font-bold">WKTの登録</span>
	</div>

	<div class="c-scroll flex h-full w-full grow flex-col gap-3 overflow-auto p-2">
		<HorizontalSelectBox
			label="入力方法を選択"
			bind:group={sourceMode}
			options={[
				{ key: 'file', name: 'ファイル' },
				{ key: 'text', name: 'テキスト' }
			]}
		/>

		{#if sourceMode === 'file'}
			<div class="flex flex-col gap-4">
				<div
					role="region"
					class="border-sub bg-base/40 flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors {isDragover
						? 'border-white bg-black/40'
						: ''}"
					ondragover={(event) => {
						event.preventDefault();
						isDragover = true;
					}}
					ondragleave={() => {
						isDragover = false;
					}}
					ondrop={onDropFile}
				>
					<span class="text-base font-bold select-none">ここにWKTファイルをドロップ</span>
					<button class="c-btn-confirm min-w-[180px] p-3 text-base" onclick={openFilePicker}>
						ファイルを選択
					</button>
					<input
						bind:this={fileInput}
						type="file"
						accept=".wkt,.ewkt,.txt"
						class="hidden"
						onchange={onFileChange}
					/>
					{#if wktFile}
						<span class="text-sm text-gray-300">{wktFile.name}</span>
					{/if}
				</div>
			</div>
		{/if}

		{#if sourceMode === 'text'}
			<div class="flex flex-col gap-2">
				<label class="flex flex-col gap-2">
					<span class="text-base font-bold select-none">データ名</span>
					<input
						type="text"
						class="bg-base text-main w-full rounded-lg p-2 focus:outline-0"
						bind:value={manualEntryName}
					/>
				</label>
				<label class="flex flex-col gap-2">
					<span class="text-base font-bold select-none">WKTテキスト</span>
					<textarea
						class="bg-base text-main min-h-[220px] w-full rounded-lg p-3 font-mono text-sm focus:outline-0"
						bind:value={inputText}
						oninput={() => {
							rawGeojson = null;
							sourceEpsgCode = null;
							showGeometryTypeDialog = false;
							geometryTypeOptions = [];
							selectedGeometryType = '';
						}}
						placeholder="SRID=4326;POINT(136.9 35.5)"
					></textarea>
				</label>
			</div>
		{/if}

		{#if sourceEpsgCode}
			<p class="text-sm text-gray-300">SRID: EPSG:{sourceEpsgCode}</p>
		{/if}
	</div>

	<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
		<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
		<button
			onclick={submit}
			disabled={$isProcessing || (sourceMode === 'file' && !wktFile)}
			class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
			(sourceMode === 'file' && !wktFile)
				? 'cursor-not-allowed opacity-50'
				: ''}"
		>
			決定
		</button>
	</div>
{/if}
