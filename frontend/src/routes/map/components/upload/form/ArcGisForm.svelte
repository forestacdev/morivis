<script lang="ts">
	import { slide } from 'svelte/transition';
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createRasterEntry } from '$routes/map/data/entries/raster';
	import { createVectorTileEntry } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import {
		fetchArcGisMapServerInfo,
		type ArcGisMapServerInfo,
		fetchArcGisFeatureServerInfo,
		fetchArcGisCatalog,
		isArcGisCatalogUrl,
		esriGeometryTypeToGeoJSON,
		type ArcGisFeatureServerInfo,
		type ArcGisCatalogService,
		extractWebMapItemId,
		fetchArcGisWebMap,
		rendererToColorsStyle,
		typesToColorsStyle,
		type ArcGisWebMapLayer,
		type ArcGisRenderer
	} from '$routes/map/utils/formats/arcgis';
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
				// WebMap アイテムID (32文字hex)
				if (/^[0-9a-f]{32}$/i.test(value.trim())) return true;
				return value.startsWith('http://') || value.startsWith('https://');
			})
	});

	type UrlFormSchema = yup.InferType<typeof urlValidation>;

	let forms = $state<UrlFormSchema>({ url: '' });
	let isUrlDisabled = $state<boolean>(true);
	let urlErrors = $state<Partial<Record<keyof UrlFormSchema, string>>>({});

	// カタログ状態
	let catalogServices = $state<ArcGisCatalogService[]>([]);
	let searchQuery = $state<string>('');
	let selectedServiceUrl = $state<string>('');

	// サービス検出結果
	type DetectedType = 'featureserver' | 'mapserver' | null;
	let detectedType = $state<DetectedType>(null);

	// FeatureServer状態
	let featureServerInfo = $state<ArcGisFeatureServerInfo | null>(null);
	let selectedLayerId = $state<string>('');

	// MapServer状態
	let mapServerInfo = $state<ArcGisMapServerInfo | null>(null);

	// WebMap状態
	let webMapLayers = $state<ArcGisWebMapLayer[]>([]);
	let selectedWebMapLayerRenderer = $state<ArcGisRenderer | undefined>(undefined);
	let selectedWebMapLayerOpacity = $state<number | undefined>(undefined);

	// ステップ: 'input' | 'catalog' | 'webmap' | 'service'
	let step = $state<'input' | 'catalog' | 'webmap' | 'service'>('input');

	const selectedLayer = $derived(
		featureServerInfo?.layers.find((l) => String(l.id) === selectedLayerId)
	);

	const filteredServices = $derived(
		searchQuery
			? catalogServices.filter((s) =>
					s.displayName.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: catalogServices
	);

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

	const resetState = () => {
		catalogServices = [];
		featureServerInfo = null;
		mapServerInfo = null;
		selectedLayerId = '';
		selectedServiceUrl = '';
		searchQuery = '';
		detectedType = null;
		webMapLayers = [];
		selectedWebMapLayerRenderer = undefined;
		selectedWebMapLayerOpacity = undefined;
	};

	/**
	 * URLの種類を自動判定してサービス情報を取得
	 */
	const isMapServerUrl = (url: string): boolean => {
		const cleaned = url.replace(/\/+$/, '').split('?')[0];
		return cleaned.endsWith('/MapServer') || /\/MapServer\/\d+$/.test(cleaned);
	};

	/**
	 * URLを正規化し、レイヤーIDがあれば抽出する
	 */
	const parseArcGisUrl = (url: string): { url: string; layerId: string | null } => {
		let cleaned = url.split('?')[0].replace(/\/+$/, '');
		// /query を除去
		cleaned = cleaned.replace(/\/query$/i, '');

		// レイヤーIDを抽出してから除去
		let layerId: string | null = null;
		const featureMatch = cleaned.match(/\/FeatureServer\/(\d+)$/i);
		const mapMatch = cleaned.match(/\/MapServer\/(\d+)$/i);
		if (featureMatch) {
			layerId = featureMatch[1];
			cleaned = cleaned.replace(/(\/FeatureServer)\/\d+$/i, '$1');
		} else if (mapMatch) {
			layerId = mapMatch[1];
			cleaned = cleaned.replace(/(\/MapServer)\/\d+$/i, '$1');
		}

		return { url: cleaned, layerId };
	};

	const fetchInfo = async () => {
		isProcessing.set(true);
		resetState();

		try {
			const rawUrl = forms.url.trim();

			// WebMap判定
			const webMapInfo = extractWebMapItemId(rawUrl);
			if (webMapInfo) {
				const webMap = await fetchArcGisWebMap(webMapInfo.portalUrl, webMapInfo.itemId);
				const featureLayers = webMap.layers.filter(
					(l) => l.url && l.layerType === 'ArcGISFeatureLayer'
				);

				if (featureLayers.length === 0) {
					showNotification('FeatureLayerが見つかりませんでした', 'error');
					step = 'input';
					return;
				}

				webMapLayers = featureLayers;
				step = 'webmap';
				return;
			}

			const parsed = parseArcGisUrl(rawUrl);
			const url = parsed.url;

			if (isArcGisCatalogUrl(url)) {
				// カタログURL
				const catalog = await fetchArcGisCatalog(url);
				catalogServices = catalog.services;
				step = 'catalog';

				if (catalogServices.length === 0) {
					showNotification('サービスが見つかりませんでした', 'error');
					step = 'input';
				}
			} else if (isMapServerUrl(url)) {
				// MapServer URL
				await fetchMapServerInfo(url);
			} else {
				// FeatureServer URL
				await fetchFeatureServerInfo(url);
				// URLにレイヤーIDが指定されていた場合、自動選択
				if (parsed.layerId && featureServerInfo) {
					const exists = featureServerInfo.layers.some((l) => String(l.id) === parsed.layerId);
					if (exists) {
						selectedLayerId = parsed.layerId;
					}
				}
			}
		} catch (e) {
			showNotification('情報の取得に失敗しました', 'error');
			console.error(e);
			step = 'input';
		} finally {
			isProcessing.set(false);
		}
	};

	const selectService = async (service: ArcGisCatalogService) => {
		isProcessing.set(true);
		selectedServiceUrl = service.url;

		try {
			if (service.type === 'MapServer') {
				await fetchMapServerInfo(service.url);
			} else {
				await fetchFeatureServerInfo(service.url);
			}
		} catch (e) {
			showNotification('サービス情報の取得に失敗しました（認証が必要な可能性があります）', 'error');
			console.error(e);
			step = 'catalog';
		} finally {
			isProcessing.set(false);
		}
	};

	const fetchFeatureServerInfo = async (url: string) => {
		const info = await fetchArcGisFeatureServerInfo(url);

		if (info.layers.length === 0) {
			throw new Error('レイヤーが見つかりませんでした');
		}

		featureServerInfo = info;
		detectedType = 'featureserver';
		step = 'service';

		if (info.layers.length === 1) {
			selectedLayerId = String(info.layers[0].id);
		}
	};

	const fetchMapServerInfo = async (url: string) => {
		const info = await fetchArcGisMapServerInfo(url);
		mapServerInfo = info;
		detectedType = 'mapserver';
		step = 'service';
	};

	const selectWebMapLayer = async (layer: ArcGisWebMapLayer) => {
		isProcessing.set(true);
		selectedWebMapLayerRenderer = layer.renderer;
		selectedWebMapLayerOpacity = layer.opacity;

		try {
			const parsed = parseArcGisUrl(layer.url);
			selectedServiceUrl = parsed.url;
			await fetchFeatureServerInfo(parsed.url);
			// レイヤーIDが指定されていた場合、自動選択
			if (parsed.layerId && featureServerInfo) {
				const exists = featureServerInfo.layers.some((l) => String(l.id) === parsed.layerId);
				if (exists) {
					selectedLayerId = parsed.layerId;
				}
			}
		} catch (e) {
			showNotification('サービス情報の取得に失敗しました', 'error');
			console.error(e);
			step = 'webmap';
		} finally {
			isProcessing.set(false);
		}
	};

	const backToWebMap = () => {
		featureServerInfo = null;
		mapServerInfo = null;
		selectedLayerId = '';
		detectedType = null;
		selectedWebMapLayerRenderer = undefined;
		selectedWebMapLayerOpacity = undefined;
		step = 'webmap';
	};

	const backToCatalog = () => {
		featureServerInfo = null;
		mapServerInfo = null;
		selectedLayerId = '';
		detectedType = null;
		step = 'catalog';
	};

	const registrationFeatureServer = () => {
		if (!selectedLayer || !featureServerInfo) return;

		const geojsonGeomType = esriGeometryTypeToGeoJSON(selectedLayer.geometryType);
		if (!geojsonGeomType) {
			showNotification('対応していないジオメトリタイプです', 'error');
			return;
		}

		const serviceUrl = selectedServiceUrl || parseArcGisUrl(forms.url.trim()).url;
		const baseUrl = serviceUrl.split('?')[0].replace(/\/+$/, '');
		const layerUrl = `${baseUrl}/${selectedLayer.id}`;

		const entry = createVectorTileEntry(
			selectedLayer.name,
			layerUrl,
			'geojsonLayer',
			geojsonGeomType,
			undefined,
			{ bounds: selectedLayer.bounds }
		);

		if (entry) {
			entry.format.type = 'esri-feature';
			const fields = selectedLayer.fields
				.filter((f) => f.type !== 'esriFieldTypeOID' && f.type !== 'esriFieldTypeGlobalID')
				.map((f) => ({ key: f.name, label: f.alias || f.name }));
			entry.properties.fields = fields;
			entry.properties.attributeView.popupKeys = fields.map((f) => f.key);

			// スタイル適用: WebMapのrenderer > レイヤーのdrawingInfo > typesによるランダム色分け
			const renderer = selectedWebMapLayerRenderer ?? selectedLayer.drawingInfo?.renderer;
			const isPolygon = geojsonGeomType === 'Polygon';
			if (renderer) {
				const colorsStyle = rendererToColorsStyle(renderer, isPolygon);
				if (colorsStyle) {
					entry.style.colors = colorsStyle;
				}
			} else if (
				selectedLayer.typeIdField &&
				selectedLayer.types &&
				selectedLayer.types.length > 0
			) {
				const colorsStyle = typesToColorsStyle(
					selectedLayer.typeIdField,
					selectedLayer.types,
					isPolygon
				);
				if (colorsStyle) {
					entry.style.colors = colorsStyle;
				}
			}
			if (selectedWebMapLayerOpacity != null) {
				// Opacity型に最も近い値にマップ
				const opacityMap = [0.3, 0.5, 0.7, 1] as const;
				entry.style.opacity = opacityMap.reduce((prev, curr) =>
					Math.abs(curr - selectedWebMapLayerOpacity!) <
					Math.abs(prev - selectedWebMapLayerOpacity!)
						? curr
						: prev
				);
			}

			showDataEntry = entry;
			showDialogType = null;
			showNotification('FeatureServerレイヤーを登録しました', 'success');
		} else {
			showNotification('データの登録に失敗しました', 'error');
		}
	};

	const registrationMapServer = () => {
		if (!mapServerInfo) return;

		const entry = createRasterEntry(mapServerInfo.name, mapServerInfo.tileUrl, {
			tileSize: mapServerInfo.tileSize,
			minZoom: mapServerInfo.minZoom,
			maxZoom: mapServerInfo.maxZoom,
			bounds: mapServerInfo.bounds
		});

		showDataEntry = entry;
		showDialogType = null;
		showNotification('MapServerレイヤーを登録しました', 'success');
	};

	const registration = () => {
		if (detectedType === 'mapserver') {
			registrationMapServer();
		} else {
			registrationFeatureServer();
		}
	};

	const cancel = () => {
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">ArcGIS サービスの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<!-- URL入力 -->
	<form
		class="flex w-full items-center gap-2 p-2"
		onsubmit={(e) => {
			e.preventDefault();
			if (!isUrlDisabled && !$isProcessing) fetchInfo();
		}}
	>
		<div class="grow">
			<TextForm bind:value={forms.url} label="ArcGIS REST URL / WebMap URL" error={urlErrors.url} />
		</div>
	</form>

	<!-- カタログ: サービス一覧 -->
	{#if step === 'catalog' && catalogServices.length > 0}
		<div transition:slide class="flex w-full flex-col gap-2 px-2">
			<div class="text-sm text-gray-400">{catalogServices.length} 件のサービス</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="サービス名で検索..."
				class="w-full rounded border border-gray-600 bg-gray-800 p-2 text-sm text-white placeholder-gray-500"
			/>
			<div class="max-h-[300px] overflow-y-auto rounded border border-gray-700">
				{#each filteredServices as service}
					<button
						onclick={() => selectService(service)}
						disabled={$isProcessing}
						class="flex w-full cursor-pointer items-center justify-between border-b border-gray-700 px-3 py-2 text-left text-sm text-gray-200 transition last:border-b-0 hover:bg-gray-700 disabled:opacity-50"
					>
						<span class="truncate">{service.displayName}</span>
						<span
							class="ml-2 shrink-0 rounded px-1.5 py-0.5 text-xs {service.type === 'FeatureServer'
								? 'bg-blue-900 text-blue-300'
								: 'bg-green-900 text-green-300'}"
						>
							{service.type === 'FeatureServer' ? 'Feature' : 'Map'}
						</span>
					</button>
				{/each}
				{#if filteredServices.length === 0}
					<div class="p-3 text-center text-sm text-gray-500">一致するサービスがありません</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- WebMap: レイヤー一覧 -->
	{#if step === 'webmap' && webMapLayers.length > 0}
		<div transition:slide class="flex w-full flex-col gap-2 px-2">
			<div class="text-sm text-gray-400">{webMapLayers.length} 件のレイヤー (WebMap)</div>
			<div class="max-h-[300px] overflow-y-auto rounded border border-gray-700">
				{#each webMapLayers as layer}
					<button
						onclick={() => selectWebMapLayer(layer)}
						disabled={$isProcessing}
						class="flex w-full cursor-pointer items-center justify-between border-b border-gray-700 px-3 py-2 text-left text-sm text-gray-200 transition last:border-b-0 hover:bg-gray-700 disabled:opacity-50"
					>
						<span class="min-w-0 grow truncate">{layer.title}</span>
						{#if layer.renderer?.type === 'uniqueValue'}
							<span
								class="ml-2 shrink-0 rounded bg-purple-900 px-1.5 py-0.5 text-xs text-purple-300"
							>
								スタイル付き
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- サービス情報表示 -->
	{#if step === 'service'}
		<div transition:slide class="w-full px-2">
			{#if webMapLayers.length > 0}
				<button
					onclick={backToWebMap}
					class="mb-2 cursor-pointer text-sm text-blue-400 hover:underline"
				>
					← レイヤー一覧に戻る
				</button>
			{:else if catalogServices.length > 0}
				<button
					onclick={backToCatalog}
					class="mb-2 cursor-pointer text-sm text-blue-400 hover:underline"
				>
					← サービス一覧に戻る
				</button>
			{/if}

			<!-- FeatureServer -->
			{#if detectedType === 'featureserver' && featureServerInfo}
				<div class="mb-2 text-sm font-bold text-gray-200">{featureServerInfo.name}</div>
				<div class="mb-1 rounded bg-blue-900/30 px-2 py-1 text-xs text-blue-300">
					FeatureServer (ベクター)
				</div>

				{#if featureServerInfo.layers.length > 1}
					<div class="mb-2">
						<label class="mb-1 block text-sm text-gray-300">
							レイヤーを選択
							<select
								bind:value={selectedLayerId}
								class="mt-1 w-full rounded border border-gray-600 bg-gray-800 p-2 text-sm text-white"
							>
								<option value="" disabled>選択してください</option>
								{#each featureServerInfo.layers as layer}
									<option value={String(layer.id)}>
										{layer.name}
										({esriGeometryTypeToGeoJSON(layer.geometryType) ?? layer.geometryType})
									</option>
								{/each}
							</select>
						</label>
					</div>
				{/if}

				{#if selectedLayer}
					<div class="text-sm text-gray-300">
						<div class="font-bold">{selectedLayer.name}</div>
						<div class="mt-1 text-xs text-gray-400">
							<div>
								ジオメトリ: {esriGeometryTypeToGeoJSON(selectedLayer.geometryType) ??
									selectedLayer.geometryType}
							</div>
							<div>フィールド数: {selectedLayer.fields.length}</div>
							<div>最大取得件数/リクエスト: {selectedLayer.maxRecordCount}</div>
							{#if selectedLayer.description}
								<div class="mt-1">{selectedLayer.description}</div>
							{/if}
						</div>
					</div>
				{/if}
			{/if}

			<!-- MapServer -->
			{#if detectedType === 'mapserver' && mapServerInfo}
				<div class="mb-2 text-sm font-bold text-gray-200">{mapServerInfo.name}</div>
				<div class="mb-1 rounded bg-green-900/30 px-2 py-1 text-xs text-green-300">
					MapServer (ラスタータイル)
				</div>
				<div class="mt-1 text-xs text-gray-400">
					<div>ズーム: {mapServerInfo.minZoom} - {mapServerInfo.maxZoom}</div>
					<div>タイルサイズ: {mapServerInfo.tileSize}px</div>
					{#if mapServerInfo.description}
						<div class="mt-1">{mapServerInfo.description}</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>

	{#if step === 'input'}
		<button
			onclick={fetchInfo}
			disabled={isUrlDisabled || $isProcessing}
			class="c-btn-confirm min-w-[150px] cursor-pointer p-4 text-lg {isUrlDisabled || $isProcessing
				? 'cursor-not-allowed px-8 opacity-50'
				: ''}"
		>
			情報を取得
		</button>
	{/if}

	{#if step === 'service'}
		{#if (detectedType === 'featureserver' && selectedLayer) || detectedType === 'mapserver'}
			<button
				onclick={registration}
				disabled={$isProcessing}
				class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing
					? 'cursor-not-allowed opacity-50'
					: ''}"
			>
				決定
			</button>
		{/if}
	{/if}
</div>
