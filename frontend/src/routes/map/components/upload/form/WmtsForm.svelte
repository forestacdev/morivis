<script lang="ts">
	import { slide } from 'svelte/transition';
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createRasterEntry } from '$routes/map/data/entries/raster';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import { parseWmsCapabilities, type WmsSourceInfo } from '$routes/map/utils/file/wms';
	import {
		parseWmtsCapabilities,
		type MapLibreRasterSourceInfo
	} from '$routes/map/utils/file/wmts';
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
	}

	let forms = $state<UrlFormSchema>({ url: '' });
	let isUrlDisabled = $state<boolean>(true);
	let urlErrors = $state<Partial<Record<keyof UrlFormSchema, string>>>({});

	let serviceType = $state<'wms' | 'wmts' | ''>('');
	let layers = $state<LayerItem[]>([]);
	let selectedLayerId = $state<string>('');

	const selectedLayer = $derived(layers.find((l) => l.id === selectedLayerId));

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
		detail: info.tileMatrixSet ? `TileMatrixSet: ${info.tileMatrixSet}` : undefined
	});

	const wmsToLayerItem = (info: WmsSourceInfo): LayerItem => ({
		id: info.id,
		title: info.title,
		tileUrl: info.tileUrl,
		tileSize: 256
	});

	const fetchLayers = async () => {
		isProcessing.set(true);
		layers = [];
		selectedLayerId = '';
		serviceType = '';

		try {
			const url = forms.url.trim();

			// まずWMTSを試行
			const wmtsResult = await parseWmtsCapabilities(url);
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
			bounds: selectedLayer.bounds
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
	<div class="flex w-full items-center gap-2 p-2">
		<div class="grow">
			<TextForm bind:value={forms.url} label="Capabilities URL" error={urlErrors.url} />
		</div>
	</div>

	{#if serviceType}
		<div transition:slide class="w-full px-2 text-sm text-gray-300">
			検出: {serviceType.toUpperCase()} ({layers.length}レイヤー)
		</div>
	{/if}

	{#if layers.length > 0}
		<div transition:slide class="w-full p-2">
			<div class="flex flex-col gap-1">
				<label for="layer-select" class="text-sm text-gray-300">レイヤーを選択</label>
				<select
					id="layer-select"
					bind:value={selectedLayerId}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				>
					<option value="" disabled>選択してください</option>
					{#each layers as layer}
						<option value={layer.id}>
							{layer.title}
							{#if layer.minZoom != null && layer.maxZoom != null}
								(z{layer.minZoom}-{layer.maxZoom})
							{/if}
						</option>
					{/each}
				</select>
			</div>
		</div>

		{#if selectedLayer}
			<div class="w-full px-2 text-xs text-gray-400">
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
