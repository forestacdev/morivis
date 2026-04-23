<script lang="ts">
	import { slide } from 'svelte/transition';
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createRasterEntry } from '$routes/map/data/entries/raster';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import {
		parseWmsCapabilities,
		type WmsSourceInfo,
		type WmsTimeDimensionInfo
	} from '$routes/map/utils/formats/wms';
	import {
		parseWmtsCapabilities,
		type MapLibreRasterSourceInfo
	} from '$routes/map/utils/formats/wmts';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
	}

	let { showDataEntry = $bindable(), showDialogType = $bindable() }: Props = $props();

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

	// 共通レイヤー型
	interface LayerItem {
		id: string;
		title: string;
		tileUrl: string;
		tileSize?: number;
		minZoom?: number;
		maxZoom?: number;
		bounds?: [number, number, number, number];
		format?: string;
		detail?: string;
		timeDimension?: WmsTimeDimensionInfo;
	}

	let forms = $state<UrlFormSchema>({ url: '' });
	let isUrlDisabled = $state<boolean>(true);
	let urlErrors = $state<Partial<Record<keyof UrlFormSchema, string>>>({});

	let serviceType = $state<'wms' | 'wmts' | ''>('');
	let layers = $state<LayerItem[]>([]);
	let selectedLayerId = $state<string>('');
	let filterTimeOnly = $state(false);
	let searchQuery = $state('');
	let currentPage = $state(0);
	const PAGE_SIZE = 20;

	const filteredLayers = $derived.by(() => {
		let result = filterTimeOnly
			? layers.filter((l) => l.timeDimension && l.timeDimension.values.length > 0)
			: layers;
		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			result = result.filter(
				(l) => l.title.toLowerCase().includes(q) || l.id.toLowerCase().includes(q)
			);
		}
		return result;
	});
	const totalPages = $derived(Math.max(1, Math.ceil(filteredLayers.length / PAGE_SIZE)));
	const pagedLayers = $derived(
		filteredLayers.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
	);
	const selectedLayer = $derived(filteredLayers.find((l) => l.id === selectedLayerId));

	// フィルタ・検索変更時にページをリセット
	let prevFilterKey = $state('');
	$effect(() => {
		const key = `${filterTimeOnly}_${searchQuery}`;
		if (key !== prevFilterKey) {
			prevFilterKey = key;
			currentPage = 0;
		}
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
						if (err.path) {
							newErrors[err.path] = err.message;
						}
					});
				}
				urlErrors = newErrors;
			});
	});

	const wmtsToLayerItem = (info: MapLibreRasterSourceInfo): LayerItem => ({
		id: info.id,
		title: info.title,
		tileUrl: info.source.tiles[0],
		tileSize: info.source.tileSize,
		minZoom: info.source.minzoom,
		maxZoom: info.source.maxzoom,
		bounds: info.bounds,
		format: info.format,
		detail: info.tileMatrixSet ? `TileMatrixSet: ${info.tileMatrixSet}` : undefined,
		timeDimension: info.timeDimension
	});

	const wmsToLayerItem = (info: WmsSourceInfo): LayerItem => ({
		id: info.id,
		title: info.title,
		tileUrl: info.tileUrl,
		tileSize: 256,
		timeDimension: info.timeDimension
	});

	const fetchLayers = async () => {
		isProcessing.set(true);
		layers = [];
		selectedLayerId = '';
		serviceType = '';
		searchQuery = '';
		currentPage = 0;
		filterTimeOnly = false;

		try {
			const url = forms.url.trim();

			// まずWMTSを試行
			let wmtsResult = await parseWmtsCapabilities(url);

			// EPSG:4326のみのCapabilitiesで結果が空の場合、epsg3857版にリトライ
			if ((!wmtsResult || wmtsResult.length === 0) && /epsg4326/i.test(url)) {
				const mercatorUrl = url.replace(/epsg4326/gi, 'epsg3857');
				wmtsResult = await parseWmtsCapabilities(mercatorUrl);
			}

			if (wmtsResult && wmtsResult.length > 0) {
				serviceType = 'wmts';
				layers = wmtsResult.map(wmtsToLayerItem);
			} else {
				// WMTSで失敗したらWMSを試行
				const wmsResult = await parseWmsCapabilities(url);
				if (wmsResult && wmsResult.length > 0) {
					serviceType = 'wms';
					layers = wmsResult.map(wmsToLayerItem);
				} else {
					showNotification('レイヤーが見つかりませんでした', 'error');
					return;
				}
			}

			console.log('取得したレイヤー:', layers);

			if (layers.length === 1) {
				selectedLayerId = layers[0].id;
			}
		} catch (e) {
			showNotification('Capabilitiesの取得に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const registration = () => {
		if (!selectedLayer) return;

		const entry = createRasterEntry(selectedLayer.title, selectedLayer.tileUrl, {
			tileSize: selectedLayer.tileSize,
			minZoom: selectedLayer.minZoom,
			maxZoom: selectedLayer.maxZoom,
			bounds: selectedLayer.bounds,
			wmsTimeDimension: selectedLayer.timeDimension
		});

		showDataEntry = entry;
		showDialogType = null;
		showNotification('レイヤーを登録しました', 'success');
	};

	const cancel = () => {
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">WMS/WMTSの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<form
		class="flex w-full items-center p-2"
		onsubmit={(e) => {
			e.preventDefault();
			if (!isUrlDisabled && !$isProcessing) fetchLayers();
		}}
	>
		<div class="grow">
			<TextForm bind:value={forms.url} label="Capabilities URL" error={urlErrors.url} />
		</div>
	</form>

	{#if serviceType}
		<div transition:slide class="w-full px-2 text-sm text-gray-300">
			検出: {serviceType.toUpperCase()} ({layers.length}レイヤー)
		</div>
	{/if}

	{#if layers.length > 0}
		<div transition:slide class="flex w-full flex-col gap-2 px-2">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="レイヤーを検索..."
				class="bg-sub rounded border border-gray-600 p-2 text-sm text-white placeholder-gray-500"
			/>

			{#if serviceType === 'wms' && layers.some((l) => l.timeDimension)}
				<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-300">
					<input type="checkbox" bind:checked={filterTimeOnly} class="accent-blue-500" />
					時間軸のあるレイヤーのみ表示
				</label>
			{/if}

			<div class="text-xs text-gray-400">
				{filteredLayers.length}件中 {currentPage * PAGE_SIZE + 1}-{Math.min(
					(currentPage + 1) * PAGE_SIZE,
					filteredLayers.length
				)}件を表示
			</div>
		</div>

		<div transition:slide class="flex w-full flex-col gap-1 px-2">
			{#each pagedLayers as layer}
				<button
					type="button"
					onclick={() => {
						selectedLayerId = layer.id;
					}}
					class="w-full cursor-pointer rounded border p-2 text-left text-sm transition-colors
						{selectedLayerId === layer.id
						? 'border-blue-500 bg-blue-500/20 text-white'
						: 'border-gray-700 bg-transparent text-gray-300 hover:border-gray-500 hover:bg-white/5'}"
				>
					<div class="truncate">{layer.title}</div>
					{#if layer.minZoom != null && layer.maxZoom != null}
						<span class="text-xs text-gray-500">z{layer.minZoom}-{layer.maxZoom}</span>
					{/if}
					{#if layer.timeDimension}
						<span class="text-xs text-blue-400"
							>&#x1f552; {layer.timeDimension.values.length}ステップ</span
						>
					{/if}
				</button>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex w-full items-center justify-center gap-2 px-2">
				<button
					type="button"
					disabled={currentPage === 0}
					onclick={() => {
						currentPage--;
					}}
					class="rounded border border-gray-600 px-3 py-1 text-sm text-gray-300 transition-colors
						{currentPage === 0 ? 'cursor-not-allowed opacity-30' : 'cursor-pointer hover:bg-white/10'}"
				>
					&lt;
				</button>
				<span class="text-sm text-gray-400">{currentPage + 1} / {totalPages}</span>
				<button
					type="button"
					disabled={currentPage >= totalPages - 1}
					onclick={() => {
						currentPage++;
					}}
					class="rounded border border-gray-600 px-3 py-1 text-sm text-gray-300 transition-colors
						{currentPage >= totalPages - 1
						? 'cursor-not-allowed opacity-30'
						: 'cursor-pointer hover:bg-white/10'}"
				>
					&gt;
				</button>
			</div>
		{/if}

		{#if selectedLayer}
			<div transition:slide class="w-full px-2 text-xs text-gray-400">
				{#if selectedLayer.format}
					<div>フォーマット: {selectedLayer.format}</div>
				{/if}
				{#if selectedLayer.detail}
					<div>{selectedLayer.detail}</div>
				{/if}
				<div class="mt-1 break-all">URL: {selectedLayer.tileUrl}</div>
			</div>
		{/if}
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={fetchLayers}
		disabled={isUrlDisabled || $isProcessing}
		class="c-btn-confirm min-w-[150px] cursor-pointer p-4 text-lg {isUrlDisabled || $isProcessing
			? 'cursor-not-allowed px-8 opacity-50'
			: ''}"
	>
		{layers.length > 0 ? 'レイヤーを再取得' : 'レイヤーを取得'}
	</button>
	{#if layers.length > 0}
		<button
			onclick={registration}
			disabled={$isProcessing || !selectedLayer}
			class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing || !selectedLayer
				? 'cursor-not-allowed opacity-50'
				: ''}"
		>
			決定
		</button>
	{/if}
</div>
