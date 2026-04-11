<script lang="ts">
	import { slide } from 'svelte/transition';
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import {
		buildWcsGetCoverageUrl,
		describeWcsCoverage,
		getWcsPreferredFormat,
		parseWcsCapabilities,
		type WcsCapabilitiesInfo,
		type WcsCoverageDescription,
		type WcsCoverageSummary
	} from '$routes/map/utils/file/wcs';
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
				if (!value) return false;
				return value.startsWith('http://') || value.startsWith('https://');
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
	let selectedCrs = $state('EPSG:4326');
	let imageWidth = $state('1024');
	let imageHeight = $state('1024');
	let bboxInputs = $state({
		west: '',
		south: '',
		east: '',
		north: ''
	});

	const selectedCoverage = $derived(
		capabilities?.coverages.find((coverage) => coverage.id === selectedCoverageId) ?? null
	);
	const formatOptions = $derived.by(() => {
		const formats = [
			...(coverageDescription?.supportedFormats ?? []),
			...(capabilities?.supportedFormats ?? [])
		].filter(Boolean);
		return [...new Set(formats)];
	});
	const crsOptions = $derived.by(() => {
		const crsList = coverageDescription?.supportedCrs ?? [];
		return crsList.length > 0 ? crsList : ['EPSG:4326'];
	});

	$effect(() => {
		urlValidation
			.validate(forms, { abortEarly: false })
			.then(() => {
				isUrlDisabled = false;
				urlErrors = {};
			})
			.catch((error) => {
				isUrlDisabled = true;
				const newErrors: Record<string, string> = {};
				if (error.inner && Array.isArray(error.inner)) {
					error.inner.forEach((err: yup.ValidationError) => {
						if (err.path) newErrors[err.path] = err.message;
					});
				}
				urlErrors = newErrors;
			});
	});

	const updateBboxInputs = (bbox: [number, number, number, number] | null) => {
		if (!bbox) return;
		bboxInputs = {
			west: String(bbox[0]),
			south: String(bbox[1]),
			east: String(bbox[2]),
			north: String(bbox[3])
		};
	};

	const fetchCapabilities = async () => {
		if (isUrlDisabled) return;

		isProcessing.set(true);
		capabilities = null;
		coverageDescription = null;
		selectedCoverageId = '';

		try {
			const result = await parseWcsCapabilities(forms.url.trim());
			if (!result || result.coverages.length === 0) {
				showNotification('WCS 2.0 の Coverage が見つかりませんでした', 'error');
				return;
			}

			capabilities = result;
			selectedCoverageId = result.coverages[0].id;
			selectedFormat = getWcsPreferredFormat(result.supportedFormats);
			selectedCrs = 'EPSG:4326';
			updateBboxInputs(result.coverages[0].bbox);
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
				if (description?.bbox) {
					updateBboxInputs(description.bbox);
				} else {
					updateBboxInputs(coverage.bbox);
				}

				const preferredFormat = getWcsPreferredFormat([
					...(description?.supportedFormats ?? []),
					...caps.supportedFormats
				]);
				selectedFormat = preferredFormat;
				selectedCrs =
					description?.supportedCrs.find((crs) => crs === 'EPSG:4326') ??
					description?.supportedCrs[0] ??
					'EPSG:4326';
			} catch (error) {
				console.error(error);
				coverageDescription = null;
				updateBboxInputs(coverage.bbox);
			} finally {
				isProcessing.set(false);
			}
		};

		if (capabilities && selectedCoverage) {
			loadDescription(selectedCoverage, capabilities);
		}
	});

	const parseBboxInputs = (): [number, number, number, number] | null => {
		const values = [
			Number.parseFloat(bboxInputs.west),
			Number.parseFloat(bboxInputs.south),
			Number.parseFloat(bboxInputs.east),
			Number.parseFloat(bboxInputs.north)
		];
		if (values.some((value) => !Number.isFinite(value))) return null;
		if (values[0] >= values[2] || values[1] >= values[3]) return null;
		return values as [number, number, number, number];
	};

	const extractServiceException = (text: string): string | null => {
		const xml = new DOMParser().parseFromString(text, 'text/xml');
		const message =
			xml
				.querySelector('ExceptionText, ows\\:ExceptionText, ServiceException')
				?.textContent?.trim() ??
			xml.documentElement.textContent?.trim() ??
			null;
		return message;
	};

	const sanitizeFileName = (value: string): string => value.replace(/[^\w.-]+/g, '_');

	const registration = async () => {
		if (!capabilities || !selectedCoverage) return;

		const bbox = parseBboxInputs();
		if (!bbox) {
			showNotification('取得範囲の値が不正です', 'error');
			return;
		}
		const width = Number.parseInt(imageWidth, 10);
		const height = Number.parseInt(imageHeight, 10);
		if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
			showNotification('出力サイズの値が不正です', 'error');
			return;
		}

		isProcessing.set(true);

		try {
			const coverageUrl = buildWcsGetCoverageUrl({
				serviceUrl: capabilities.serviceUrl,
				version: capabilities.version,
				coverageId: selectedCoverage.id,
				format: selectedFormat || 'image/tiff',
				axisLabels: coverageDescription?.axisLabels,
				bbox,
				crs: selectedCrs,
				width,
				height
			});

			const response = await fetch(coverageUrl);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const blob = await response.blob();
			const contentType = response.headers.get('content-type') ?? blob.type;
			if (/xml|html|text/i.test(contentType)) {
				const message = extractServiceException(await blob.text());
				throw new Error(message ?? 'WCS GetCoverage が画像ではなく XML/HTML を返しました');
			}

			dropFile = new File([blob], `${sanitizeFileName(selectedCoverage.id)}.tif`, {
				type: blob.type || 'image/tiff'
			});
			showDialogType = 'geotiff';
			showNotification('WCS から GeoTIFF を取得しました', 'success');
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
		class="flex w-full items-start gap-3 p-2"
		onsubmit={(e) => {
			e.preventDefault();
			if (!isUrlDisabled && !$isProcessing) fetchCapabilities();
		}}
	>
		<div class="grow">
			<TextForm bind:value={forms.url} label="WCS URL" error={urlErrors.url} />
		</div>
		<button
			type="submit"
			disabled={isUrlDisabled || $isProcessing}
			class="c-btn-confirm mt-9 min-w-[140px] p-3 text-base {isUrlDisabled || $isProcessing
				? 'cursor-not-allowed opacity-50'
				: 'cursor-pointer'}"
		>
			読込
		</button>
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
					{#each capabilities.coverages as coverage}
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
				</div>
			{/if}

			<label class="flex flex-col gap-2">
				<span class="text-base font-bold select-none">出力形式</span>
				<select
					class="bg-base text-main w-full rounded-lg p-2 focus:outline-0"
					bind:value={selectedFormat}
				>
					{#each formatOptions.length > 0 ? formatOptions : ['image/tiff'] as format}
						<option value={format}>{format}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-base font-bold select-none">CRS</span>
				<select
					class="bg-base text-main w-full rounded-lg p-2 focus:outline-0"
					bind:value={selectedCrs}
				>
					{#each crsOptions as crs}
						<option value={crs}>{crs}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="grid w-full grid-cols-2 gap-3 px-2">
			<label class="flex flex-col gap-2">
				<span class="text-sm font-bold select-none">West</span>
				<input
					type="number"
					step="any"
					class="bg-base text-main rounded-lg p-2 focus:outline-0"
					bind:value={bboxInputs.west}
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-sm font-bold select-none">South</span>
				<input
					type="number"
					step="any"
					class="bg-base text-main rounded-lg p-2 focus:outline-0"
					bind:value={bboxInputs.south}
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-sm font-bold select-none">East</span>
				<input
					type="number"
					step="any"
					class="bg-base text-main rounded-lg p-2 focus:outline-0"
					bind:value={bboxInputs.east}
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-sm font-bold select-none">North</span>
				<input
					type="number"
					step="any"
					class="bg-base text-main rounded-lg p-2 focus:outline-0"
					bind:value={bboxInputs.north}
				/>
			</label>
		</div>

		<div class="grid w-full grid-cols-2 gap-3 px-2">
			<label class="flex flex-col gap-2">
				<span class="text-sm font-bold select-none">Width</span>
				<input
					type="number"
					min="1"
					step="1"
					class="bg-base text-main rounded-lg p-2 focus:outline-0"
					bind:value={imageWidth}
				/>
			</label>
			<label class="flex flex-col gap-2">
				<span class="text-sm font-bold select-none">Height</span>
				<input
					type="number"
					min="1"
					step="1"
					class="bg-base text-main rounded-lg p-2 focus:outline-0"
					bind:value={imageHeight}
				/>
			</label>
		</div>

		<div class="w-full px-2 text-xs text-gray-400">
			WCS 1.0 / 2.0 の GeoTIFF 出力を想定しています。サーバー側で CORS が無効だと取得できません。
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registration}
		disabled={!capabilities || !selectedCoverage || $isProcessing}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {!capabilities ||
		!selectedCoverage ||
		$isProcessing
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		GeoTIFF を取得
	</button>
</div>
