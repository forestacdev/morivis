<script lang="ts">
	import { slide } from 'svelte/transition';
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import {
		WEB_MERCATOR_MAX_LAT,
		WEB_MERCATOR_MAX_LNG,
		WEB_MERCATOR_MIN_LAT,
		WEB_MERCATOR_MIN_LNG
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import { DEFAULT_RASTER_BASEMAP_STYLE } from '$routes/map/data/entries/raster/_style';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterBaseMapStyle, RasterWcsEntry } from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';
	import {
		describeWcsCoverage,
		estimateWcsCoverageRange,
		getWcsPreferredCrs,
		getWcsPreferredFormat,
		parseWcsCapabilities,
		type WcsCapabilitiesInfo,
		type WcsCoverageDescription,
		type WcsCoverageSummary
	} from '$routes/map/utils/formats/wcs';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import { normalizeHttpUrlInput } from '$routes/map/utils/platform/request';
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

	let capabilities = $state<WcsCapabilitiesInfo | null>(null);
	let coverageDescription = $state<WcsCoverageDescription | null>(null);
	let selectedCoverageId = $state('');
	let selectedFormat = $state('image/tiff');
	let selectedCrs = $state('OGC:CRS84');

	const selectedCoverage = $derived(
		capabilities?.coverages.find((coverage) => coverage.id === selectedCoverageId) ?? null
	);
	const currentCoverageBbox = $derived(coverageDescription?.bbox ?? selectedCoverage?.bbox ?? null);
	const currentCoverageBboxText = $derived.by(() => {
		if (!currentCoverageBbox) return null;
		return currentCoverageBbox.map((value) => value.toFixed(6)).join(', ');
	});
	const isSupportedWcsRenderFormat = (format: string): boolean =>
		/image\/(png|jpeg|jpg|webp|gif)|image\/tiff|geotiff|tif/i.test(format);
	const isSupportedWcsTiffFormat = (format: string): boolean =>
		/image\/tiff|geotiff|tif/i.test(format);
	const formatOptions = $derived.by(() => {
		const formats = [
			...(coverageDescription?.supportedFormats ?? []),
			...(capabilities?.supportedFormats ?? [])
		].filter(Boolean);
		return [...new Set(formats.filter((format) => isSupportedWcsRenderFormat(format)))];
	});
	const crsOptions = $derived.by(() => {
		const crsList = coverageDescription?.supportedCrs ?? [];
		return crsList.length > 0 ? crsList : ['OGC:CRS84'];
	});
	const resolvedSelectedFormat = $derived(
		formatOptions.find((format) => format === selectedFormat) ?? formatOptions[0] ?? 'image/tiff'
	);
	const resolvedSelectedCrs = $derived(
		crsOptions.find((crs) => crs === selectedCrs) ?? getWcsPreferredCrs(crsOptions)
	);

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
					if (err.path) newErrors[err.path] = err.message;
				});
			}
			urlErrors = newErrors;
		}
	});

	const fetchCapabilities = async () => {
		if (isUrlDisabled) return;

		isProcessing.set(true);
		capabilities = null;
		coverageDescription = null;
		selectedCoverageId = '';

		try {
			const normalizedUrl = normalizeHttpUrlInput(forms.url);
			if (!normalizedUrl) {
				showNotification('URLの形式が正しくありません', 'error');
				return;
			}
			forms.url = normalizedUrl;
			const result = await parseWcsCapabilities(normalizedUrl);
			if (!result || result.coverages.length === 0) {
				showNotification('WCS 2.0 の Coverage が見つかりませんでした', 'error');
				return;
			}

			capabilities = result;
			selectedCoverageId = result.coverages[0].id;
			selectedFormat = getWcsPreferredFormat(result.supportedFormats);
			selectedCrs = getWcsPreferredCrs([]);
		} catch (error) {
			console.error(error);
			showNotification('WCS Capabilities の取得に失敗しました', 'error');
		} finally {
			isProcessing.set(false);
		}
	};

	$effect(() => {
		const loadDescription = async (coverage: WcsCoverageSummary, caps: WcsCapabilitiesInfo) => {
			isProcessing.set(true);
			try {
				const description = await describeWcsCoverage(caps.serviceUrl, caps.version, coverage.id);
				coverageDescription = description;

				const preferredFormat = getWcsPreferredFormat([
					...(description?.supportedFormats ?? []),
					...caps.supportedFormats
				]);
				selectedFormat = preferredFormat;
				selectedCrs = getWcsPreferredCrs(description?.supportedCrs ?? []);
			} catch (error) {
				console.error(error);
				coverageDescription = null;
			} finally {
				isProcessing.set(false);
			}
		};

		if (capabilities && selectedCoverage) {
			loadDescription(selectedCoverage, capabilities);
		}
	});

	const sanitizeFileName = (value: string): string => value.replace(/[^\w.-]+/g, '_');
	const clampBoundsToWebMercator = (
		bbox: [number, number, number, number]
	): [number, number, number, number] => {
		return [
			Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[0])),
			Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[1])),
			Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[2])),
			Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[3]))
		];
	};

	const registration = async () => {
		if (!capabilities || !selectedCoverage) return;

		const bbox = currentCoverageBbox;
		if (!bbox) {
			showNotification('取得範囲の値が不正です', 'error');
			return;
		}

		isProcessing.set(true);

		try {
			if (!resolvedSelectedFormat || !isSupportedWcsRenderFormat(resolvedSelectedFormat)) {
				showNotification('WCS は画像系または GeoTIFF 系の出力形式のみ対応しています', 'error');
				return;
			}

			const resolvedBounds = clampBoundsToWebMercator(bbox);
			const rangeSummary = isSupportedWcsTiffFormat(resolvedSelectedFormat)
				? await estimateWcsCoverageRange({
						serviceUrl: capabilities.serviceUrl,
						version: capabilities.version,
						coverageId: selectedCoverage.id,
						format: resolvedSelectedFormat,
						axisLabels: coverageDescription?.axisLabels,
						bbox,
						crs: resolvedSelectedCrs
					})
				: null;
			const entry: RasterWcsEntry<RasterBaseMapStyle> = {
				id: `wcs_${crypto.randomUUID()}`,
				type: 'raster',
				format: {
					type: 'wcs',
					url: capabilities.serviceUrl,
					serviceUrl: capabilities.serviceUrl,
					version: capabilities.version,
					coverageId: selectedCoverage.id,
					outputFormat: resolvedSelectedFormat,
					crs: resolvedSelectedCrs,
					axisLabels: coverageDescription?.axisLabels ?? []
				},
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					attribution: 'WCS',
					name: sanitizeFileName(selectedCoverage.title || selectedCoverage.id),
					tileSize: 512,
					bounds: resolvedBounds,
					minZoom: 0,
					maxZoom: 24,
					xyzImageTile: findCenterTile(resolvedBounds)
				},
				...(rangeSummary && {
					properties: {
						bands: {
							numBands: rangeSummary.numBands,
							sampleRanges: rangeSummary.sampleRanges
						}
					}
				}),
				interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
				style: { ...DEFAULT_RASTER_BASEMAP_STYLE }
			};

			showDataEntry = entry;
			showDialogType = null;
			showNotification('WCS レイヤーを登録しました', 'success');
		} catch (error) {
			console.error(error);
			showNotification(
				error instanceof Error
					? error.message
					: 'WCS GetCoverage に失敗しました。CORS 設定も確認してください。',
				'error'
			);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">WCS の登録</span>
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
			<TextForm bind:value={forms.url} label="WCS URL" error={urlErrors.url} />
		</div>
	</form>

	{#if capabilities}
		<div transition:slide class="w-full px-2 text-sm text-gray-300">
			WCS {capabilities.version} / {capabilities.coverages.length} coverage
		</div>

		<div class="flex w-full flex-col gap-2 px-2">
			<label class="flex flex-col gap-2">
				<span class="text-base font-bold select-none">Coverage</span>
				<select
					class="bg-base text-main w-full rounded-lg p-2 focus:outline-0"
					bind:value={selectedCoverageId}
				>
					{#each capabilities.coverages as coverage (coverage.id)}
						<option value={coverage.id}>{coverage.title}</option>
					{/each}
				</select>
			</label>

			{#if selectedCoverage}
				<div class="rounded-lg border border-gray-700 p-3 text-sm text-gray-300">
					<div>ID: {selectedCoverage.id}</div>
					{#if coverageDescription?.srsName}
						<div>CRS: {coverageDescription.srsName}</div>
					{/if}
					{#if coverageDescription?.axisLabels.length}
						<div>Axis: {coverageDescription.axisLabels.join(', ')}</div>
					{/if}
					{#if currentCoverageBboxText}
						<div>BBOX: {currentCoverageBboxText}</div>
					{/if}
				</div>
			{/if}

			<div class="rounded-lg border border-gray-700 p-3 text-sm text-gray-300">
				<div>出力形式: {resolvedSelectedFormat}</div>
				<div>CRS: {resolvedSelectedCrs}</div>
			</div>
		</div>

		<div class="w-full px-2 text-xs text-gray-400">
			WCS 1.0 / 2.0 の画像出力または GeoTIFF 出力を protocol 経由で描画します。サーバー側で CORS
			が無効だと取得できません。
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	{#if capabilities}
		<button
			onclick={registration}
			disabled={!selectedCoverage || $isProcessing}
			class="c-btn-confirm min-w-[200px] p-4 text-lg {!selectedCoverage || $isProcessing
				? 'cursor-not-allowed opacity-50'
				: 'cursor-pointer'}"
		>
			WCS レイヤーを追加
		</button>
	{:else}
		<button
			onclick={fetchCapabilities}
			disabled={isUrlDisabled || $isProcessing}
			class="c-btn-confirm min-w-[200px] p-4 text-lg {isUrlDisabled || $isProcessing
				? 'cursor-not-allowed opacity-50'
				: 'cursor-pointer'}"
		>
			読込
		</button>
	{/if}
</div>
