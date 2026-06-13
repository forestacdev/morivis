<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import GeoJsonRenderModeForm, {
		type GeoJsonRenderMode
	} from '$routes/map/components/upload/form/GeoJsonRenderModeForm.svelte';
	import GeometryTypeForm from '$routes/map/components/upload/form/GeometryTypeForm.svelte';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import { createGeoJson3DEntry } from '$routes/map/data/entries/model';
	import {
		createGeoJsonEntry,
		filterByGeometryType,
		getGeometryTypes
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import type { AnyGeometry, GeometryCollection } from '$routes/map/types/geometry';
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
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		transformOptionMode: TransformOptionMode;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		zoneConfirmMode: 'entry' | 'georef' | null;
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
		zoneConfirmMode = $bindable(),
		pendingZoneGeoRefData = $bindable()
	}: Props = $props();

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};

	const to2dPosition = (position: number[]): [number, number] => {
		return [position[0], position[1]];
	};

	const stripGeometryZ = (
		geometry: AnyGeometry | GeometryCollection
	): AnyGeometry | GeometryCollection => {
		if (geometry.type === 'Point') {
			return {
				...geometry,
				coordinates: to2dPosition(geometry.coordinates as unknown as number[])
			};
		}

		if (geometry.type === 'MultiPoint' || geometry.type === 'LineString') {
			return {
				...geometry,
				coordinates: geometry.coordinates.map((position) =>
					to2dPosition(position as unknown as number[])
				)
			};
		}

		if (geometry.type === 'MultiLineString' || geometry.type === 'Polygon') {
			return {
				...geometry,
				coordinates: geometry.coordinates.map((line) =>
					line.map((position) => to2dPosition(position as unknown as number[]))
				)
			};
		}

		if (geometry.type === 'MultiPolygon') {
			return {
				...geometry,
				coordinates: geometry.coordinates.map((polygon) =>
					polygon.map((line) =>
						line.map((position) => to2dPosition(position as unknown as number[]))
					)
				)
			};
		}

		return {
			type: 'GeometryCollection',
			geometries: geometry.geometries.map((child) => stripGeometryZ(child))
		} as unknown as GeometryCollection;
	};

	const stripGeojsonZ = (geojson: FeatureCollection): FeatureCollection => {
		return {
			...geojson,
			features: geojson.features.map((feature) => ({
				...feature,
				geometry: stripGeometryZ(feature.geometry as unknown as AnyGeometry | GeometryCollection)
			}))
		} as unknown as FeatureCollection;
	};

	let rawGeojson = $state.raw<FeatureCollection | null>(null);
	let sourceMode = $state<'file' | 'text'>('file');
	let inputText = $state('');
	let manualEntryName = $state('GeoJSONデータ');
	let fileInput = $state<HTMLInputElement | null>(null);
	let isDragover = $state(false);
	let showGeometryTypeDialog = $state(false);
	let showRenderModeDialog = $state(false);
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');
	let selectedRenderMode = $state<GeoJsonRenderMode>('geojson');

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
		return has3dGeometryForType(rawGeojson, selectedGeometryType);
	});
	const canUseDeckRender = $derived.by(() => {
		if (!selectedGeometryType || !selectedGeometryHasZ) return false;
		return canRender3dGeoJsonWithDeck(selectedGeometryType);
	});

	const readFile = (file: File): Promise<FeatureCollection> =>
		isFgb ? fgbFileToGeojson(file) : (geoJsonFileToGeoJson(file) as Promise<FeatureCollection>);

	const readText = (): FeatureCollection => {
		return geoJsonTextToGeoJson(inputText);
	};

	const setSelectedFile = (file: File) => {
		dropFile = file;
		rawGeojson = null;
		showGeometryTypeDialog = false;
		showRenderModeDialog = false;
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

		return createGeoJsonEntry(stripGeojsonZ(geojson), geometryType, entryName, bbox, undefined, {
			attribution: 'GeoJSON'
		});
	};

	const prepareGeojson = async (geojson: FeatureCollection) => {
		rawGeojson = geojson;
		const types = getGeometryTypes(rawGeojson);

		geometryTypeOptions = types.map((type) => ({
			key: type,
			name: GEOMETRY_TYPE_LABELS[type] ?? type
		}));
		selectedGeometryType = types[0] ?? '';
		showGeometryTypeDialog = false;
		showRenderModeDialog = false;

		const primaryGeometryType = types[0];
		if (types.length > 1) {
			showGeometryTypeDialog = true;
			return;
		}

		if (
			primaryGeometryType &&
			has3dGeometryForType(rawGeojson, primaryGeometryType) &&
			canRender3dGeoJsonWithDeck(primaryGeometryType)
		) {
			showRenderModeDialog = true;
			return;
		}

		await processGeojson();
	};

	$effect(() => {
		if (!geojsonFile || sourceMode !== 'file' || rawGeojson) return;

		isProcessing.set(true);
		readFile(geojsonFile)
			.then(async (geojson) => {
				await prepareGeojson(geojson);
			})
			.catch((error) => {
				showNotification(
					error instanceof GeoJsonParseError
						? error.message
						: 'GeoJSONファイルの読み込みに失敗しました',
					'error'
				);
				console.error(error);
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
			filtered = filterByGeometryType(rawGeojson, selectedGeometryType);
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
		showRenderModeDialog = false;
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
			const geojsonData = filterByGeometryType(transformedGeojson, selectedGeometryType);

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

			if (!entry) {
				showNotification('データが不正です', 'error');
				return;
			}

			showDataEntry = entry;
			dropFile = null;
			showGeometryTypeDialog = false;
			showRenderModeDialog = false;
			showDialogType = null;
			showNotification('ファイルを読み込みました', 'success');
		} catch (error) {
			showNotification('GeoJSONファイルの変換中にエラーが発生しました', 'error');
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showGeometryTypeDialog = false;
		showRenderModeDialog = false;
		showDialogType = null;
	};

	const backToGeoJsonInput = () => {
		showGeometryTypeDialog = false;
		showRenderModeDialog = false;
	};

	const backToGeometryTypeSelection = () => {
		showRenderModeDialog = false;
		showGeometryTypeDialog = geometryTypeOptions.length > 1;
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
		if (showGeometryTypeDialog) {
			showGeometryTypeDialog = false;
			if (canUseDeckRender) {
				showRenderModeDialog = true;
				return;
			}

			await processGeojson();
			return;
		}

		if (showRenderModeDialog) {
			await processGeojson();
			return;
		}

		if (sourceMode === 'text' && !rawGeojson) {
			await loadFromText();
		}

		if (!rawGeojson || !selectedGeometryType) return;

		if (canUseDeckRender) {
			showRenderModeDialog = true;
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
			const mode = zoneConfirmMode ?? 'entry';
			if (mode !== 'entry') return;
			untrack(() => {
				zoneConfirmedEpsg = null;
				zoneConfirmMode = null;
				void convertAndCreateEntry(epsg);
			});
		}
	});
</script>

{#if showGeometryTypeDialog}
	<GeometryTypeForm
		title="GeoJSONのジオメトリ選択"
		bind:selectedGeometryType
		{geometryTypeOptions}
		onCancel={cancel}
		onConfirm={submit}
	/>
{:else if showRenderModeDialog}
	<GeoJsonRenderModeForm
		{entryName}
		{selectedGeometryType}
		bind:selectedRenderMode
		onBack={backToGeometryTypeSelection}
		onCancel={cancel}
		onConfirm={submit}
	/>
{:else}
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
						oninput={() => {
							rawGeojson = null;
							showGeometryTypeDialog = false;
							showRenderModeDialog = false;
							geometryTypeOptions = [];
							selectedGeometryType = '';
						}}
						placeholder={'{"type":"FeatureCollection","features":[]}'}
					></textarea>
				</label>
			</div>
		{/if}
	</div>

	<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
		<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
		<button
			onclick={submit}
			disabled={$isProcessing ||
				(sourceMode === 'file' && !geojsonFile) ||
				(sourceMode === 'text' && !inputText.trim())}
			class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
			(sourceMode === 'file' && !geojsonFile) ||
			(sourceMode === 'text' && !inputText.trim())
				? 'cursor-not-allowed opacity-50'
				: ''}"
		>
			決定
		</button>
	</div>
{/if}
