<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import * as yup from 'yup';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import {
		createGeoJsonEntry,
		filterByGeometryType,
		getGeometryTypes
	} from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import {
		fetchWfsFeatureCollection,
		getWfsPreferredOutputFormat,
		parseWfsCapabilities,
		type WfsCapabilitiesInfo
	} from '$routes/map/utils/formats/wfs';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { normalizeHttpUrlInput } from '$routes/map/utils/platform/request';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		remoteWfsUrl: string | null;
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		remoteWfsUrl = $bindable(),
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

	const urlValidation = yup.object().shape({
		url: yup
			.string()
			.required('URLを入力してください。')
			.test('url-format', 'URLの形式が正しくありません', (value) => {
				return !value || !!normalizeHttpUrlInput(value);
			})
	});

	type UrlFormSchema = yup.InferType<typeof urlValidation>;

	let forms = $state<UrlFormSchema>({ url: '' });
	let isUrlDisabled = $state<boolean>(true);
	let urlErrors = $state<Partial<Record<keyof UrlFormSchema, string>>>({});

	let capabilities = $state<WfsCapabilitiesInfo | null>(null);
	let selectedFeatureTypeName = $state('');
	let selectedOutputFormat = $state('application/json');
	let maxFeatures = $state('1000');

	let rawGeojson: FeatureCollection | null = null;
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');

	const selectedFeatureType = $derived(
		capabilities?.featureTypes.find(
			(featureType) => featureType.name === selectedFeatureTypeName
		) ?? null
	);
	const outputFormatOptions = $derived.by(() => {
		const formats = [
			...(selectedFeatureType?.outputFormats ?? []),
			...(capabilities?.outputFormats ?? [])
		];
		return [...new Set(formats.filter(Boolean))];
	});
	const hasPendingGeometrySelection = $derived(
		!!rawGeojson && geometryTypeOptions.length > 1 && !!selectedGeometryType
	);

	const entryName = $derived(selectedFeatureType?.title || selectedFeatureTypeName || 'WFSデータ');

	$effect(() => {
		try {
			urlValidation.validateSync(forms, { abortEarly: false });
			isUrlDisabled = false;
			urlErrors = {};
		} catch (error) {
			isUrlDisabled = true;
			const newErrors: Record<string, string> = {};
			if (error instanceof yup.ValidationError && error.inner && Array.isArray(error.inner)) {
				error.inner.forEach((err: yup.ValidationError) => {
					if (err.path) {
						newErrors[err.path] = err.message;
					}
				});
			}
			urlErrors = newErrors;
		}
	});

	$effect(() => {
		if (remoteWfsUrl) {
			forms.url = remoteWfsUrl;
			remoteWfsUrl = null;
			fetchCapabilities();
		}
	});

	const resetLoadedFeature = () => {
		rawGeojson = null;
		geometryTypeOptions = [];
		selectedGeometryType = '';
	};

	const fetchCapabilities = async () => {
		isProcessing.set(true);
		capabilities = null;
		selectedFeatureTypeName = '';
		resetLoadedFeature();

		try {
			const normalizedUrl = normalizeHttpUrlInput(forms.url);
			if (!normalizedUrl) {
				showNotification('URLの形式が正しくありません', 'error');
				return;
			}
			forms.url = normalizedUrl;
			const result = await parseWfsCapabilities(normalizedUrl);
			if (!result || result.featureTypes.length === 0) {
				showNotification('WFS の FeatureType が見つかりませんでした', 'error');
				return;
			}

			capabilities = result;
			selectedFeatureTypeName = result.featureTypes[0].name;
			selectedOutputFormat = getWfsPreferredOutputFormat([
				...result.featureTypes[0].outputFormats,
				...result.outputFormats
			]);
		} catch (error) {
			console.error(error);
			showNotification('WFS Capabilities の取得に失敗しました', 'error');
		} finally {
			isProcessing.set(false);
		}
	};

	$effect(() => {
		if (!selectedFeatureType) return;
		selectedOutputFormat = getWfsPreferredOutputFormat([
			...selectedFeatureType.outputFormats,
			...(capabilities?.outputFormats ?? [])
		]);
		resetLoadedFeature();
	});

	const completeEntryCreation = async (geojson: FeatureCollection) => {
		if (!selectedGeometryType) return;

		const filtered = filterByGeometryType(geojson, selectedGeometryType);
		if (filtered.features.length === 0) {
			showNotification('選択したジオメトリタイプのフィーチャが見つかりませんでした', 'error');
			return;
		}

		const bbox = turfBbox(filtered) as [number, number, number, number];
		const entry = await createGeoJsonEntry(
			filtered,
			selectedGeometryType,
			entryName,
			bbox,
			undefined,
			{
				attribution: `WFS: ${forms.url.trim()}`
			}
		);

		if (!entry) {
			showNotification('WFS データの登録に失敗しました', 'error');
			return;
		}

		showDataEntry = entry;
		showDialogType = null;
		remoteWfsUrl = null;
		showNotification('WFS レイヤーを登録しました', 'success');
	};

	const prepareGeojson = async (geojson: FeatureCollection) => {
		rawGeojson = geojson;
		const types = getGeometryTypes(geojson);

		if (types.length === 0) {
			showNotification('有効なジオメトリが見つかりませんでした', 'error');
			return;
		}

		geometryTypeOptions = types.map((type) => ({
			key: type,
			name: GEOMETRY_TYPE_LABELS[type] ?? type
		}));
		selectedGeometryType = types[0];

		const bbox = turfBbox(geojson) as [number, number, number, number];
		if (!bbox || !isBboxValid(bbox)) {
			showZoneForm = true;
			focusBbox = bbox;
			return;
		}

		if (types.length === 1) {
			await completeEntryCreation(geojson);
		}
	};

	const fetchSelectedFeature = async () => {
		if (!capabilities || !selectedFeatureType) return;

		const count = Number.parseInt(maxFeatures, 10);
		if (!Number.isFinite(count) || count <= 0) {
			showNotification('取得件数の値が不正です', 'error');
			return;
		}

		isProcessing.set(true);
		resetLoadedFeature();

		try {
			const geojson = await fetchWfsFeatureCollection({
				serviceUrl: capabilities.serviceUrl,
				version: capabilities.version,
				typeName: selectedFeatureType.name,
				outputFormat: selectedOutputFormat,
				count
			});

			await prepareGeojson(geojson);
		} catch (error) {
			console.error(error);
			showNotification('WFS データの取得に失敗しました', 'error');
		} finally {
			isProcessing.set(false);
		}
	};

	const confirmGeometrySelection = async () => {
		if (!rawGeojson) return;

		isProcessing.set(true);
		try {
			await completeEntryCreation(rawGeojson);
		} finally {
			isProcessing.set(false);
		}
	};

	const convertAndPrepareEntry = async (epsgCode: EpsgCode) => {
		if (!rawGeojson) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const transformedGeojson = (await transformGeoJSONParallel(
				rawGeojson,
				prjContent
			)) as FeatureCollection;

			rawGeojson = transformedGeojson;
			const bbox = turfBbox(transformedGeojson) as [number, number, number, number];
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			if (geometryTypeOptions.length === 1 && selectedGeometryType) {
				await completeEntryCreation(transformedGeojson);
			}
		} catch (error) {
			console.error(error);
			showNotification('WFS データの変換中にエラーが発生しました', 'error');
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		showDialogType = null;
		remoteWfsUrl = null;
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'wfs') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndPrepareEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">WFSの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<form
		class="flex w-full items-center p-2"
		onsubmit={(e) => {
			e.preventDefault();
			if (!isUrlDisabled && !$isProcessing) fetchCapabilities();
		}}
	>
		<div class="grow">
			<TextForm
				bind:value={forms.url}
				label="Capabilities URL / サービスURL"
				error={urlErrors.url}
			/>
		</div>
	</form>

	{#if capabilities}
		<div transition:slide class="flex w-full flex-col gap-3 px-2">
			<label class="flex w-full flex-col gap-2">
				<span class="text-base font-bold select-none">FeatureType</span>
				<select
					bind:value={selectedFeatureTypeName}
					class="bg-base text-main w-full rounded-lg p-2 focus:outline-0"
				>
					{#each capabilities.featureTypes as featureType (featureType.name)}
						<option value={featureType.name}>
							{featureType.title} ({featureType.name})
						</option>
					{/each}
				</select>
			</label>

			<label class="flex w-full flex-col gap-2">
				<span class="text-base font-bold select-none">出力形式</span>
				<select
					bind:value={selectedOutputFormat}
					class="bg-base text-main w-full rounded-lg p-2 focus:outline-0"
				>
					{#each outputFormatOptions as outputFormat (outputFormat)}
						<option value={outputFormat}>{outputFormat}</option>
					{/each}
				</select>
			</label>

			<label class="flex w-full flex-col gap-2">
				<span class="text-base font-bold select-none">取得件数</span>
				<input
					type="number"
					min="1"
					step="1"
					bind:value={maxFeatures}
					class="bg-base text-main w-full rounded-lg p-2 focus:outline-0"
				/>
			</label>

			{#if selectedFeatureType}
				<div class="rounded-lg border border-white/10 p-3 text-sm text-gray-300">
					<div>タイトル: {selectedFeatureType.title}</div>
					<div>名前: {selectedFeatureType.name}</div>
					{#if selectedFeatureType.defaultCrs}
						<div>既定CRS: {selectedFeatureType.defaultCrs}</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if hasPendingGeometrySelection}
		<div transition:slide class="w-full px-2 pb-2">
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
	{#if hasPendingGeometrySelection}
		<button onclick={confirmGeometrySelection} class="c-btn-confirm min-w-[200px] p-4 text-lg">
			決定
		</button>
	{:else if !capabilities}
		<button
			onclick={fetchCapabilities}
			disabled={isUrlDisabled || $isProcessing}
			class="c-btn-confirm min-w-[200px] p-4 text-lg {isUrlDisabled || $isProcessing
				? 'cursor-not-allowed opacity-50'
				: 'cursor-pointer'}"
		>
			サービスを取得
		</button>
	{:else}
		<button
			onclick={fetchSelectedFeature}
			disabled={!capabilities || !selectedFeatureType}
			class="c-btn-confirm min-w-[200px] p-4 text-lg {capabilities && selectedFeatureType
				? 'cursor-pointer'
				: 'cursor-not-allowed opacity-50'}"
		>
			取得
		</button>
	{/if}
</div>
