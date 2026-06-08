<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { createGeoJson3DEntry } from '$routes/map/data/entries/model';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { fgbFileToGeojson } from '$routes/map/utils/formats/fgb';
	import {
		GeoJsonParseError,
		geoJsonFileToGeoJson,
		geoJsonTextToGeoJson
	} from '$routes/map/utils/formats/geojson';
	import {
		canRender3dGeoJsonWithDeck,
		has3dGeometryForType
	} from '$routes/map/utils/formats/geojson/3d';
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

	const RENDER_MODE_OPTIONS = [
		{
			key: 'geojson',
			name: '2Dで読み込む',
			description: '通常のGeoJSONレイヤーとして読み込みます。'
		},
		{ key: 'deck', name: '3Dで読み込む', description: 'deck.glを使用して3Dで表示します。' }
	] as const;

	const RENDER_MODE_DESCRIPTIONS = [
		{
			key: 'geojson',
			description: '通常のGeoJSONレイヤーとして読み込みます。'
		},
		{ key: 'deck', description: 'deck.glを使用して3Dで表示します。' }
	] as const;

	let rawGeojson: FeatureCollection | null = null;
	let sourceMode = $state<'file' | 'text'>('file');
	let inputText = $state('');
	let manualEntryName = $state('GeoJSONデータ');
	let fileInput = $state<HTMLInputElement | null>(null);
	let isDragover = $state(false);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let selectedRenderMode = $state<'deck' | 'geojson'>('geojson');

	const geojsonFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const fileExt = $derived(geojsonFile?.name.split('.').pop()?.toLowerCase() ?? '');
	const isFgb = $derived(fileExt === 'fgb');
	const entryName = $derived(
		sourceMode === 'text'
			? manualEntryName.trim() || 'GeoJSONデータ'
			: (geojsonFile?.name.replace(/\.[^.]+$/, '') ?? 'GeoJSONデータ')
	);
	const selectedGeometryHasZ = $derived.by(() => {
		if (!rawGeojson || !selectedGeometryType) return false;
		return has3dGeometryForType(rawGeojson, selectedGeometryType as VectorEntryGeometryType);
	});
	const canUseDeckRender = $derived.by(() => {
		if (!selectedGeometryType || !selectedGeometryHasZ) return false;
		return canRender3dGeoJsonWithDeck(selectedGeometryType as VectorEntryGeometryType);
	});

	const readFile = (file: File): Promise<FeatureCollection> =>
		isFgb ? fgbFileToGeojson(file) : (geoJsonFileToGeoJson(file) as Promise<FeatureCollection>);

	const readText = (): FeatureCollection => {
		return geoJsonTextToGeoJson(inputText);
	};

	const setSelectedFile = (file: File) => {
		dropFile = file;
		rawGeojson = null;
		geometryTypeOptions = [];
		selectedGeometryType = '';
	};

	const shouldUseDeckRender = (geojson: FeatureCollection, geometryType: VectorEntryGeometryType) =>
		selectedRenderMode === 'deck' &&
		canRender3dGeoJsonWithDeck(geometryType) &&
		has3dGeometryForType(geojson, geometryType);

	const createEntry = async (
		geojson: FeatureCollection,
		geometryType: VectorEntryGeometryType,
		bbox: [number, number, number, number]
	) => {
		if (shouldUseDeckRender(geojson, geometryType)) {
			return createGeoJson3DEntry(entryName, geojson, geometryType, bbox);
		}

		return createGeoJsonEntry(geojson, geometryType, entryName, bbox, undefined, {
			attribution: 'GeoJSON'
		});
	};

	const prepareGeojson = async (geojson: FeatureCollection) => {
		rawGeojson = geojson as unknown as FeatureCollection;
		const types = getGeometryTypes(rawGeojson);

		geometryTypeOptions = types.map((t) => ({
			key: t,
			name: GEOMETRY_TYPE_LABELS[t] ?? t
		}));
		selectedGeometryType = types[0];
		await processGeojson();
	};

	// ファイルドロップ時: GeoJSON/FGB → ジオメトリタイプ確認
	$effect(() => {
		if (!geojsonFile || sourceMode !== 'file') return;

		isProcessing.set(true);
		readFile(geojsonFile)
			.then(async (geojson) => {
				await prepareGeojson(geojson);
			})
			.catch((e) => {
				showNotification(
					e instanceof GeoJsonParseError ? e.message : 'GeoJSONファイルの読み込みに失敗しました',
					'error'
				);
				console.error(e);
			})
			.finally(() => {
				isProcessing.set(false);
			});
	});

	$effect(() => {
		if (!canUseDeckRender && selectedRenderMode !== 'geojson') {
			selectedRenderMode = 'geojson';
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
			showZoneForm = true;
			focusBbox = bbox as [number, number, number, number];
		} else {
			const entry = await createEntry(
				filtered,
				selectedGeometryType as VectorEntryGeometryType,
				bbox as [number, number, number, number]
			);

			if (entry) {
				showDataEntry = entry;
				dropFile = null;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			} else {
				showNotification('データが不正です', 'error');
			}
		}
	};

	// ZoneFormで座標系選択後 → 座標変換してエントリ作成
	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!rawGeojson || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const transformedGeojson = (await transformGeoJSONParallel(
				rawGeojson,
				prjContent
			)) as FeatureCollection;

			// ジオメトリタイプとレイヤーでフィルター
			let geojsonData = filterByGeometryType(
				transformedGeojson,
				selectedGeometryType as VectorEntryGeometryType
			);

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('GeoJSONファイルの変換に失敗しました', 'error');
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
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (e) {
			showNotification('GeoJSONファイルの変換中にエラーが発生しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};

	const loadFromText = async () => {
		if (!inputText.trim()) {
			showNotification('GeoJSONテキストを入力してください', 'error');
			return;
		}

		isProcessing.set(true);
		try {
			await prepareGeojson(readText());
		} catch (error) {
			showNotification(
				error instanceof GeoJsonParseError
					? error.message
					: 'GeoJSONテキストの読み込みに失敗しました',
				'error'
			);
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const submit = async () => {
		if (sourceMode === 'text') {
			await loadFromText();
			return;
		}

		await processGeojson();
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
		if (zoneConfirmedEpsg && showDialogType === 'geojson') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">{isFgb ? 'FlatGeobuf' : 'GeoJSON'}の登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<div class="w-full p-2">
		<HorizontalSelectBox
			label="入力方法を選択"
			bind:group={sourceMode}
			options={[
				{ key: 'file', name: 'ファイル' },
				{ key: 'text', name: 'テキスト' }
			]}
		/>
	</div>

	{#if sourceMode === 'file'}
		<div class="flex w-full flex-col gap-4 p-2">
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
				<span class="text-base font-bold select-none">
					ここにGeoJSON/FlatGeobufファイルをドロップ
				</span>
				<button class="c-btn-confirm min-w-[180px] p-3 text-base" onclick={openFilePicker}>
					ファイルを選択
				</button>
				<input
					bind:this={fileInput}
					type="file"
					accept=".geojson,.json,.fgb"
					class="hidden"
					onchange={onFileChange}
				/>
				{#if geojsonFile}
					<span class="text-sm text-gray-300">{geojsonFile.name}</span>
				{/if}
			</div>
		</div>
	{/if}

	{#if sourceMode === 'text'}
		<div class="flex w-full flex-col gap-2 p-2">
			<label class="flex flex-col gap-2">
				<span class="text-base font-bold select-none">データ名</span>
				<input
					type="text"
					class="bg-base text-main w-full rounded-lg p-2 focus:outline-0"
					bind:value={manualEntryName}
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-base font-bold select-none">GeoJSONテキスト</span>
				<textarea
					class="bg-base text-main min-h-[220px] w-full rounded-lg p-3 font-mono text-sm focus:outline-0"
					bind:value={inputText}
					placeholder={'{"type":"FeatureCollection","features":[]}'}
				></textarea>
			</label>
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

	{#if canUseDeckRender}
		<div class="w-full p-2">
			<HorizontalSelectBox
				label="描画方式を選択"
				bind:group={selectedRenderMode}
				options={[...RENDER_MODE_OPTIONS]}
			/>

			<div class="mt-2 text-sm text-gray-500">
				{RENDER_MODE_DESCRIPTIONS.find((opt) => opt.key === selectedRenderMode)?.description}
			</div>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={submit}
		disabled={$isProcessing || (sourceMode === 'file' && !selectedGeometryType)}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		(sourceMode === 'file' && !selectedGeometryType)
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
