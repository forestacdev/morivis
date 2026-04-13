<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onDestroy } from 'svelte';
	import { tick } from 'svelte';
	import { slide, fly, fade } from 'svelte/transition';
	import { debounce, throttle } from 'es-toolkit';

	import RecommendedData from './RecommendedData.svelte';

	import FacIcon from '$lib/components/svgs/FacIcon.svelte';
	import PrefectureIcon from '$lib/components/svgs/prefectures/PrefectureIcon.svelte';
	import { lonLatToPrefectureCode } from '$routes/map/api/address';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import LayerTypeItem from '$routes/map/components/layer_menu/LayerTypeItem.svelte';
	import MapSettingItem from '$routes/map/components/layer_menu/MapSettingItem.svelte';
	import {
		WEB_MERCATOR_JAPAN_BOUNDS,
		FAC_BOUNDS
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import type { PrefectureCode } from '$routes/map/data/pref';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { getLayerType, type LayerType } from '$routes/map/utils/entries';
	import { isBBoxOverlapping } from '$routes/map/utils/map';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';
	import { resetLayersConfirm } from '$routes/stores/confirmation';
	import { activeLayerIdsStore } from '$routes/stores/layers';
	import {
		selectedBaseMap,
		showLabelLayer,
		showHillshadeLayer,
		showXYZTileLayer,
		showRoadLayer,
		showBoundaryLayer,
		showPoiLayer,
		showStreetViewLayer,
		showCloudLayer
	} from '$routes/stores/layers';
	import { mapStore, type MapState } from '$routes/stores/map';
	import { showLayerMenu, showDataMenu, isMobile, isActiveMobileMenu } from '$routes/stores/ui';

	interface Props {
		layerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null; // データメニューの表示状態
		tempLayerEntries: GeoDataEntry[];
		featureMenuData: FeatureMenuData | null;
		resetlayerEntries: () => void; // レイヤーのリセット関数
	}

	type LayerMenuTab = 'added-data' | 'map-display';

	let {
		layerEntries = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(), // データメニューの表示状態
		featureMenuData = $bindable(),
		resetlayerEntries
	}: Props = $props();
	let enableFlip = $state(true); // アニメーションの状態
	let selectedTab = $state<LayerMenuTab>('added-data');

	// レイヤーのリセット処理
	const resetLayers = async () => {
		const result = await resetLayersConfirm();

		if (result) {
			resetlayerEntries();
		}
	};
	let modelEntries = $derived.by(() => {
		return layerEntries.filter((layer) => getLayerType(layer) === 'model');
	});

	let pointEntries = $derived.by(() => {
		return layerEntries.filter((layer) => getLayerType(layer) === 'point');
	});

	let lineEntries = $derived.by(() => {
		return layerEntries.filter((layer) => getLayerType(layer) === 'line');
	});

	let polygonEntries = $derived.by(() => {
		return layerEntries.filter((layer) => getLayerType(layer) === 'polygon');
	});

	let rasterEntries = $derived.by(() => {
		return layerEntries.filter((layer) => getLayerType(layer) === 'raster');
	});
	let lastLayerType = $derived.by(() => {
		const lastEntry = layerEntries[layerEntries.length - 1];
		return lastEntry ? (getLayerType(lastEntry) ?? null) : null;
	});

	let isDraggingLayerType = $state<LayerType | null>(null); // ドラッグ中かどうか
	let isHoveredLayerType = $state<LayerType | null>(null); // ホバー中かどうか
	let isRecommendedDataDragging = $state(false);
	let isRecommendedDataDropActive = $state(false);
	const setRecommendedDataDragging = (value: boolean) => {
		isRecommendedDataDragging = value;
	};
	let isDeleteOverlayActive = $state(false);

	let isTouchDragging = $state(false); // タッチデバイスでのドラッグ中かどうか
	let scrollContainer = $state<HTMLElement | undefined>(undefined);
	let mapState = $state<MapState>(mapStore.getState());
	let hasInitializedMapVisual = $state(false);
	let layerInRangeMap = $derived.by(() => {
		const next: Record<string, boolean> = {};

		for (const layerEntry of layerEntries) {
			let zoom = mapState.zoom;

			if ('tileSize' in layerEntry.metaData && layerEntry.metaData.tileSize === 256) {
				zoom += 1.5;
			}

			if (layerEntry.metaData.minZoom && zoom < layerEntry.metaData.minZoom) {
				next[layerEntry.id] = false;
				continue;
			}

			const layerBbox = layerEntry.metaData.bounds;
			if (!layerBbox) {
				next[layerEntry.id] = false;
				continue;
			}

			next[layerEntry.id] = isBBoxOverlapping(layerBbox, mapState.bbox);
		}

		return next;
	});
	let prefectureCode = $state<PrefectureCode | ''>('');
	let prefectureCodeError = $state(false);
	let prefectureRequestId = 0;
	let prefectureRequestController: AbortController | null = null;
	let lastRequestedPrefecturePoint: [number, number] | null = null;
	const normalizePrefecturePoint = (lng: number, lat: number): [number, number] => {
		return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
	};
	const abortPrefectureRequest = () => {
		prefectureRequestController?.abort();
		prefectureRequestController = null;
	};
	const fetchPrefectureCode = throttle((lng: number, lat: number, requestId: number) => {
		lastRequestedPrefecturePoint = normalizePrefecturePoint(lng, lat);
		prefectureRequestController = new AbortController();

		lonLatToPrefectureCode(lng, lat, prefectureRequestController.signal)
			.then((code) => {
				if (requestId !== prefectureRequestId) return;
				prefectureCode = code as PrefectureCode;
			})
			.catch((error) => {
				if (error instanceof DOMException && error.name === 'AbortError') return;
				if (requestId !== prefectureRequestId) return;
				prefectureCodeError = true;
			});
	}, 500);
	const requestPrefectureCode = debounce((lng: number, lat: number, requestId: number) => {
		fetchPrefectureCode(lng, lat, requestId);
	}, 100);
	let isCenterInJapanBounds = $derived(
		mapState.center[0] >= WEB_MERCATOR_JAPAN_BOUNDS[0] &&
			mapState.center[0] <= WEB_MERCATOR_JAPAN_BOUNDS[2] &&
			mapState.center[1] >= WEB_MERCATOR_JAPAN_BOUNDS[1] &&
			mapState.center[1] <= WEB_MERCATOR_JAPAN_BOUNDS[3]
	);
	let isCenterInFacBounds = $derived(
		mapState.center[0] >= FAC_BOUNDS[0] &&
			mapState.center[0] <= FAC_BOUNDS[2] &&
			mapState.center[1] >= FAC_BOUNDS[1] &&
			mapState.center[1] <= FAC_BOUNDS[3]
	);
	let isInFacView = $derived(isCenterInFacBounds && mapState.zoom >= 12);
	let isInJapanBounds = $derived(isCenterInJapanBounds);
	let isInJapanView = $derived(isInJapanBounds && mapState.zoom <= 5);
	let backgroundKey = $derived(
		isInFacView
			? 'fac'
			: prefectureCode
				? `pref-${prefectureCode}`
				: isInJapanView || prefectureCodeError
					? 'japan'
					: 'world'
	);

	// $effect(() => {
	// 	const [lng, lat] = mapState.center;
	// 	const [normalizedLng, normalizedLat] = normalizePrefecturePoint(lng, lat);
	// 	const requestId = ++prefectureRequestId;
	// 	const isSameAsLastRequested =
	// 		lastRequestedPrefecturePoint?.[0] === normalizedLng &&
	// 		lastRequestedPrefecturePoint?.[1] === normalizedLat;

	// 	if (!isInJapanBounds || mapState.zoom <= 5) {
	// 		fetchPrefectureCode.cancel();
	// 		requestPrefectureCode.cancel();
	// 		abortPrefectureRequest();
	// 		lastRequestedPrefecturePoint = null;
	// 		prefectureCode = '';
	// 		prefectureCodeError = false;
	// 		return;
	// 	}

	// 	if (isSameAsLastRequested) return;

	// 	abortPrefectureRequest();
	// 	prefectureCodeError = false;
	// 	requestPrefectureCode(lng, lat, requestId);
	// });

	// let isPrefCode = $derived.by(() => {
	// 	return getPrefectureCode(isLocation);
	// });

	let prevLayerIds = $state<string[]>([]);
	activeLayerIdsStore.subscribe(async (ids) => {
		const added = ids.find((id) => !prevLayerIds.includes(id));
		prevLayerIds = [...ids];
		if (!added || !scrollContainer) return;
		await tick();
		const el = scrollContainer.querySelector(`[data-layer-id="${added}"]`);
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
	});

	// レイヤーメニューの調整
	isMobile.subscribe((value) => {
		if (!value && !$showLayerMenu) {
			$showLayerMenu = true;
		}

		if (value && $showLayerMenu && $isActiveMobileMenu !== 'layer') {
			$showLayerMenu = false;
		}
	});

	const unsubscribeMapState = mapStore.onStateChange((state) => {
		mapState = state;
		hasInitializedMapVisual = true;
	});

	onDestroy(() => {
		fetchPrefectureCode.cancel();
		requestPrefectureCode.cancel();
		abortPrefectureRequest();
		unsubscribeMapState();
	});

	$effect(() => {
		if (isRecommendedDataDragging) return;
		isRecommendedDataDropActive = false;
	});
</script>

<!-- レイヤーメニュー -->
{#if $showLayerMenu}
	<div
		transition:fly={{
			duration: 300,
			y: !$isMobile ? 100 : 0,
			opacity: 0,
			delay: !$isMobile ? 100 : 0
		}}
		role="region"
		ondragover={(e) => {
			e.preventDefault();
			if (!isRecommendedDataDragging) return;
			isRecommendedDataDropActive = true;
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'copy';
			}
		}}
		ondragleave={(e) => {
			if (!(e.currentTarget instanceof HTMLElement)) return;
			const relatedTarget = e.relatedTarget;
			if (relatedTarget instanceof Node && e.currentTarget.contains(relatedTarget)) return;
			isRecommendedDataDropActive = false;
		}}
		ondrop={(e) => {
			e.preventDefault();
			isRecommendedDataDropActive = false;
			if (isDraggingLayerType !== null) return;
			const id = e.dataTransfer?.getData('application/x-entry-id');
			if (id) activeLayerIdsStore.add(id);
		}}
		class="transition-[width, transform, translate, scale] absolute z-10 flex h-full flex-col overflow-hidden duration-200 {$showLayerMenu
			? 'translate-x-0'
			: '-translate-x-[400px]'} {$isStyleEdit
			? 'delay-150 max-lg:translate-x-full lg:translate-x-[90px]'
			: ''} {$isMobile ? 'bg-main' : 'bg-transparent'}
             {$showDataMenu ? 'max-lg:w-[0px] lg:w-[80px]' : 'lg:w-side-menu max-lg:w-full'}"
		style="padding-top: env(safe-area-inset-top);"
	>
		<div class="pl-2">
			<div class="relative flex h-[72px] w-full items-center max-lg:hidden">
				{#if !$isStyleEdit && !$showDataMenu}
					<!-- 縦棒 -->
					<div
						transition:slide={{ duration: 200, axis: 'x' }}
						class="relative grid h-full w-[50px] shrink-0 place-items-center"
					>
						<div class="bg-base/60 h-full w-[2px]"></div>
					</div>
				{/if}

				{#if !$isStyleEdit && !$showDataMenu}
					<!-- タイトル -->
					<div
						transition:slide={{ duration: 200, axis: 'x' }}
						class="flex w-full flex-1 flex-col justify-center text-base select-none max-lg:hidden"
					>
						<span class="text-[2.9rem] font-bold"> morivis </span>
					</div>
				{/if}

				{#if $showDataMenu}
					<!-- 戻るボタン -->
					<div class="grid w-full shrink-0 place-items-center">
						<button
							transition:slide={{ duration: 200, axis: 'x' }}
							onclick={() => {
								$showDataMenu = false;
							}}
							class="bg-base group grid shrink-0 cursor-pointer place-items-center rounded-full p-2"
						>
							<Icon
								icon="ep:back"
								class="text-main h-6 w-6 lg:transition-transform lg:duration-150 lg:group-hover:-translate-x-1"
							/>
						</button>
					</div>
				{/if}
			</div>
		</div>

		<div
			class="relative flex h-full flex-col overflow-hidden {!$showDataMenu && !$isStyleEdit
				? 'pr-2'
				: ''}"
		>
			{#if !$isStyleEdit && !$showDataMenu}
				<div
					in:fly={{ delay: 300, duration: 300, y: -20, opacity: 0 }}
					out:fade={{ delay: 0, duration: 1 }}
					class="bg-main absolute top-0 left-[50px] z-10 flex w-full items-center pb-2"
				>
					<div class="flex flex-1 gap-2 pl-4 text-nowrap">
						<label
							class="flex w-[100px] cursor-pointer items-center justify-center overflow-hidden rounded-lg py-1 text-xs transition-colors {selectedTab ===
							'added-data'
								? 'bg-base text-black'
								: 'bg-base/40 text-gray-300'}"
						>
							<input
								type="radio"
								name="layer-menu-tab"
								bind:group={selectedTab}
								value="added-data"
								class="hidden"
							/>
							<span>追加済みデータ</span>
						</label>
						<label
							class="flex w-[80px] cursor-pointer items-center justify-center overflow-hidden rounded-lg py-1 text-xs transition-colors {selectedTab ===
							'map-display'
								? 'bg-base text-black'
								: 'bg-base/40 text-gray-300'}"
						>
							<input
								type="radio"
								name="layer-menu-tab"
								bind:group={selectedTab}
								value="map-display"
								class="hidden"
							/>
							<span>地図表示</span>
						</label>
					</div>

					<!-- <button
								class="bg-base ml-auto cursor-pointer rounded-lg p-1 px-2 text-xs text-black"
								onclick={resetLayers}
								>リセット
							</button> -->
				</div>
			{/if}
			<!-- スクロールコンテンツ -->
			<div
				bind:this={scrollContainer}
				class="flex h-full flex-col overflow-x-hidden pl-2 {$showDataMenu || $isStyleEdit
					? 'c-scroll-hidden'
					: 'c-scroll-hidden'} {isTouchDragging
					? 'touch-none overflow-hidden'
					: 'touch-auto overflow-y-auto'}"
			>
				<!-- PC表示スペース -->
				<div class="relative flex h-[30px] w-full shrink-0 items-center max-lg:hidden">
					{#if !$isStyleEdit && !$showDataMenu}
						<!-- 縦棒 -->
						<div
							transition:slide={{ duration: 200, axis: 'x' }}
							class="relative grid h-full w-[50px] shrink-0 place-items-center"
						>
							<div class="bg-base/60 h-full w-[2px]"></div>
						</div>
					{/if}

					{#if !$isStyleEdit && !$showDataMenu}
						<!-- 右側 -->
						<div
							transition:slide={{ duration: 200, axis: 'x' }}
							class="flex w-full flex-1 flex-col justify-center py-0 text-base select-none max-lg:hidden"
						></div>
					{/if}
				</div>

				<!-- 3Dモデル -->
				{#if selectedTab === 'added-data'}
					{#if modelEntries.length > 0}
						<div
							class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'model' &&
							!isDeleteOverlayActive
								? 'bg-accent/70'
								: ''}"
						>
							<LayerTypeItem
								layerType={'model'}
								{lastLayerType}
								typeEntries={modelEntries}
								{layerInRangeMap}
								bind:showDataEntry
								bind:tempLayerEntries
								bind:enableFlip
								bind:isDraggingLayerType
								bind:isHoveredLayerType
								bind:featureMenuData
								bind:isTouchDragging
								{isRecommendedDataDragging}
								{isDeleteOverlayActive}
							/>
						</div>
					{/if}
					<!-- ポイント -->
					{#if pointEntries.length > 0}
						<div
							class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'point' &&
							!isDeleteOverlayActive
								? 'bg-accent/70'
								: ''}"
						>
							<LayerTypeItem
								layerType={'point'}
								{lastLayerType}
								typeEntries={pointEntries}
								{layerInRangeMap}
								bind:showDataEntry
								bind:tempLayerEntries
								bind:enableFlip
								bind:isDraggingLayerType
								bind:isHoveredLayerType
								bind:featureMenuData
								bind:isTouchDragging
								{isRecommendedDataDragging}
								{isDeleteOverlayActive}
							/>
						</div>
					{/if}
					<!-- ライン -->
					{#if lineEntries.length > 0}
						<div
							class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'line' &&
							!isDeleteOverlayActive
								? 'bg-accent/70'
								: ''}"
						>
							<LayerTypeItem
								layerType={'line'}
								{lastLayerType}
								typeEntries={lineEntries}
								{layerInRangeMap}
								bind:showDataEntry
								bind:tempLayerEntries
								bind:enableFlip
								bind:isDraggingLayerType
								bind:isHoveredLayerType
								bind:featureMenuData
								bind:isTouchDragging
								{isRecommendedDataDragging}
								{isDeleteOverlayActive}
							/>
						</div>
					{/if}
					<!-- ポリゴン -->
					{#if polygonEntries.length > 0}
						<div
							class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'polygon' &&
							!isDeleteOverlayActive
								? 'bg-accent/70'
								: ''}"
						>
							<LayerTypeItem
								layerType={'polygon'}
								{lastLayerType}
								typeEntries={polygonEntries}
								{layerInRangeMap}
								bind:showDataEntry
								bind:tempLayerEntries
								bind:enableFlip
								bind:isDraggingLayerType
								bind:isHoveredLayerType
								bind:featureMenuData
								bind:isTouchDragging
								{isRecommendedDataDragging}
								{isDeleteOverlayActive}
							/>
						</div>
					{/if}
					<!-- ラスター -->
					{#if rasterEntries.length > 0}
						<div
							class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'raster' &&
							!isDeleteOverlayActive
								? 'bg-accent/70'
								: ''}"
						>
							<LayerTypeItem
								layerType={'raster'}
								{lastLayerType}
								typeEntries={rasterEntries}
								{layerInRangeMap}
								bind:showDataEntry
								bind:tempLayerEntries
								bind:enableFlip
								bind:isDraggingLayerType
								bind:isHoveredLayerType
								bind:featureMenuData
								bind:isTouchDragging
								{isDeleteOverlayActive}
								{isRecommendedDataDragging}
							/>
						</div>
					{/if}

					<!-- 余白 -->
					<div class="h-[300px] w-full shrink-0"></div>
				{:else if selectedTab === 'map-display'}
					<MapSettingItem>
						<Switch label="アカデミー施設等" bind:value={$showPoiLayer} />
					</MapSettingItem>
					<MapSettingItem>
						<Switch label="境界線" bind:value={$showBoundaryLayer} />
					</MapSettingItem>
					<MapSettingItem>
						<Switch label="地名等" bind:value={$showLabelLayer} />
					</MapSettingItem>
					<MapSettingItem>
						<Switch label="道路・線路" bind:value={$showRoadLayer} />
					</MapSettingItem>
					<MapSettingItem>
						<Switch label="陰影" bind:value={$showHillshadeLayer} />
					</MapSettingItem>
					<MapSettingItem>
						<Switch label="雲" bind:value={$showCloudLayer} />
					</MapSettingItem>
					<MapSettingItem>
						<Switch label="タイル座標" bind:value={$showXYZTileLayer} />
					</MapSettingItem>
					<!-- 余白 -->
					<div class="h-[100px] w-full shrink-0"></div>
				{/if}
			</div>
			<!-- フォグ -->
			{#if !$isStyleEdit && !$showDataMenu}
				<div
					in:fade={{ delay: 300 }}
					class="c-bg-fog-bottom pointer-events-none absolute bottom-0 z-10 h-[100px] w-full"
				></div>
				<!-- 背景 -->
				{#if hasInitializedMapVisual && selectedTab === 'added-data'}
					<div
						class="absolute -z-10 grid h-full w-full items-end justify-center opacity-[3%]"
						style="font-family: 'Orbitron', 'Noto Sans JP', sans-serif;"
					>
						<div
							class="[&_path]:fill-base rota absolute grid aspect-square w-full -translate-x-[90px] translate-y-[70px] scale-[2] -rotate-12 place-items-center px-6"
						>
							<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 408 347.9"
								><path
									d="M199.4 160.4c.4-.4.6-1 .9-1.4-1-.5-2.7-.6-3.5-1.3-.4-.3-.1-1.7-.6-2s-1.4 0-2.1-.3c-1.8-.8-5.5-.8-5.7-2.8-1.2.5-2.2 1-3.3.9-.6 0-1.2-1.4-1.9-1.5-.5 0-1.3 1-1.7 1.1-1 .1-2.4-.2-3.3 0-1.3.2-2.4 1.6-3.9 1.8-6.3 1.2-6.9-7.3-13.6-6.5 1.4-1.6 3.2-3.1 4.4-4.8 1.3-1.8 1.7-4.1 3.3-5.8 1.9-2 2.5-1.4 5.2-.6 2.2.7 3.6 1.4 5.6 2.2 3.9 1.5 6.4 3.6 11.1 3.3 2.4-.2 4.1-1 5.3-2.5.2-.3-.5-1.3-.2-1.7s1.5-.3 1.6-.8c.5-1.1 1.9-1.3.3-2.4 1.9-.3 3.4-1.1 5.1-1.9-.1 0-1.6-1-1.3-1.1.9-.2 1.7-.5 2.6-.7-1-1.6 1.2-3.1 1.6-4.8.1-.4.8-1 .8-1.4 0-.3-.7-.9-.6-1.2.1-1-1.3-1.4.7-2.3-.7-.2-1.3-.9-2-1.1.6-.6.9-1.5 1.5-2-2.2-.6.1-1.4-.5-2.4-.8-1.1-1.4-.9-3.2-.9.3-.6.1-1.5.4-2.1-1.3 0-4.3.5-5.4 0-.7-.3-1.4-1.3-1.5-1.8.4 1.2 1.2-3.1.6-2.1.3-.5 1.4-1.1 1.8-1.8s.2-1.7.5-2.4c.9-1.8 3.3-3.2 1.5-5 .7-.1 1.3-.8 1.9-.9-1.1-1.8-2.9-2.7-4.7-3.6 1.4-1.9 2.3-3.8 3.5-5.8 1.8-3 2.6-2.3 0-5 1.6-1.6 4.2-3.6 4.1-5.4-.1-2.3-1.6-1-.9-3.3.4-1.3 1.7-2.3 2.6-3.3.5-.5 1.5-1.2 1.8-1.8.2-.5-.5-.7-.4-1.1s-.5-.7-.3-1.2c.3-.7 1.2-1.4 1.7-2 2-2.6 2.9-3.7 2.1-6.9-2.2 1.3-4.8 1.9-6.8 3.2-.9.6-1.8 1.3-2.4 1.5-.3.1-.6-.8-1.1-.7-.7.2-1.2 1.1-1.8 1.3-1.1.4-2.3.6-3.5.7-.5.1-1.6.5-2.1.4-.6-.2-.7-.9-1.3-1.1-.5-.2-.6-.9-1.1-1s-1.1.8-1.6.9c-1.2.3-2.2 1-3.4 1.4-.7.2-3.4 1.2-4 .9-.8-.4-.5-2.1-1.5-2.4-1.2-.4-2.2 1.4-2.9 1.4-.8 0-1.7-1.5-2.6-1.5-1-.1-1.8 1.4-2.9 1.2-1.4-.2-1.7-1.2-2.2-2.2-.3-.6-.1-2.4-.8-2.6-.8-.3-2.9 3.1-3.4 3.7-.1-.8-.7-1.5-.8-2.3-1.1 1.3-2.2 2.5-3.4 3.8-.9-2.2-1.2-.7-2.5-.5-1 .2-2.2.8-3.4 1-.9.2-2.5.9-3.3.7-.5-.1-2.6-.7-1.9-2-.4.8-1.3 2.6-2 3-.7.3-1.9-.5-2.5-.1-.7.4-.8 1.7-1.5 2.1-1.6.9-.8 0-2.5.3-2 .5-.3-.8-1.9.7-.9.8-.7 1.9-1.8 2.7-1.8 1.3-4.6.4-5.1 3.1-3.5-2.7-3-.8-6.2 1.2-.5.4-.9 1-1.5 1.3-.4.2-1.5-.7-1.9-.4-.7.5-1.3 2.8-1.6 3.6-.3-.6-1-1-1.3-1.6-.5 1.5-.7 4.4-2.5 4 .5 1.3 1.1 2.6 1.6 3.9-.5 0-1 .4-1.5.4 2.1 3.3.3 1.3-.2 3.9-.2 1.2.9 2 1 3.6 0 .2-1.3.8-1.3 1.5s.9 2.7 1.3 3.2c1 1.2 2.7 1.9 3.8 3.1 1.8 2 3.8 4.6 5.3 6.6.7 1 .9 3.4 1.8 4.2.8.7 3.4 1.3 4.5 1.7-4.8 4.6-9.6 9.6-14.8 13.8-2.1 1.7-5.4 4.6-8 5.4-3.3 1-7.5-.5-10.8-1.1-6.4-1.3-12.5-2.9-18.4-5.5-6-2.6-12.2-6.3-18.5-7.7-3.7-.8-7.4-1.5-11.1-2.6-1.7-.5-3.5-1.2-5.2-1.6-3-.8-2.9-.8-3.9 2.2 9.4 2.7 19.3 4.4 28.3 8.2 5.2 2.2 10.2 4.7 15.5 6.7 5 1.8 11 2.6 14.8 6.3 4.9 4.7 1.7 8.2 1.7 14 0 4.7.9 10.2 2.6 14.5.7 1.7 2.1 3.7 1.4 4.9-1.1 1.8-6.6 1.7-8.5 3-1.7 1.1-2.9 3.3-4.4 4.7-1.9 1.7-4.1 3.2-6.2 4.7-2.5 1.8-5.1 3.5-7.4 5.6-.9.8-2.6 2.1-3 3.3-.4 1.3.3 2.2.1 3.1-.6 3-3.6 5.4-2.5 8.8.1.4-.2 1 0 1.5.1.4 1.8 0 1.9.7.3 1.2-.8 3.5-1 4.7 3.2-1.5 1.6 1 2.9 2.3 1 .9 1.3.8 3.2.2 0 1.1-.1 2.1-.1 3.2.9-.1 1.9-.3 2.8-.4 0 2.1-.6 6.3.4 7.7.3.4 1.7.2 2 .5.5.4.5 1.4 1 1.8 1.3 1 .7 3 3.1 1-1.3 2.6 2.3 3.2 4 4.3 1.9 1.2 3.4 4.3 5.6 1.8.4 1.3.7 2.6 1.1 4 .4-.5 1.2-.8 1.6-1.3.8 2 1.4 3.8 3.1 5.2 2.2 1.7 1.8 1 4.2-1 .6 1.3 1 1.9 1.8 2.3 0 0 1.5-.4 1.8-.4.7.1 1.4.6 2 .9 2.6 1.1 3.5 2.6 5.2 4.8 1.3-1.2 2-2.3 3.4-2.2 2.3.1 1.6 2.7 4.2.3.4 1.2.7 3.6 1.6 3.9s2.3-1 3.2-.8c.4.1 1 1.3 1.5 1.5.6.3 1.2-.2 1.7.2.8.6 1.1 2 2 2.5 1.8 1.1 1.4.8 3.7-.7.4.8 1 2.9 1.7 3.4.8.5 1.8-.2 2.8-.1 2.2.2 4.8 2 6.9 2.8-.3-1-1.5-3.1-1.3-4.1.2-.9 1.6-1.5 1.6-2.4.4-4.2-3.9-3.3.9-6.1-1.3-1.7-2.3-2.4-1.8-4.1.5-1.5 3.1-2.4 3.3-3.4.3-1.5-2.5-3.4-2.2-5.1.4-2.4 2.6-2.3 4.5-2.6-.4-1.2-1.8-3.9-1.5-5.1.3-1.1 2.3-1.9 2.3-3 0-.7-1.2-1.5-1.3-2.2-.3-1.7 0-.2.3-2 .2-1.4 1.1-2.5 1.4-3.8.2-.8.9-1 .7-1.7s-1.7-1.2-1.8-1.9c-.1-1 1.9-1.9 1.8-3-.1-.8-1.5-1.3-1.8-2-.2-.8.2-1.2.3-2.1.1-.6.4-2 .7-2.6s1.8 0 2.1-.7-3-3-3.4-3.7c-.8-1.3-.7-2-1-3.7-.6-3.1-2.8-4.5-3.1-7.7-.3-2.7 1.1-5.7 0-8-1.1-2.4-5.3-2.7-5-5.5-2.8 1.8-1.6-.3-3.3-1.2-.9-.5-3.1-.4-4-1.1-2.2-1.6-.1-1.9-3-2.2-1.4-.1-3.2.4-4.5.9-6 2.1-12.5 2.6-19 2.3-3.8-.1-6 .1-7.7-3.4-1.5-3-2.3-5.9-2.9-9.2-.3-1.7-.7-3.4-.8-5.1-.2-2.5.7-3.4 1.2-5.9.7-3.4.1-6.9-.9-10.1 5.6-.6 11.2 1.4 16.7 2.6 6.6 1.5 13.5 2.6 20 4.5s13 4 19.5 5.9c2.8.8 7.1 1.6 4 4.9-2.2 2.3-5.1 3.7-7.2 6.3-2.5 3.2-3 5.5-2.6 9.5.4 3.7 1.7 5.8 2.4 9.4.1-.3.3-.6.5-.8-.4.3 3.2 4.5 3.4 4.7-.1-.2 1.6 2.3 1.2 2 .8.5 1 .8 2.5.1-.1 2.7 2.4 2.2 1.7 4.6.6-.2 1.3 0 1.8-.2-.3 1.8 1.2 1.1 2.2 1.6 1.3.7.1 2.5 2.7 1.4.1.5 6.6 6.5 6.2 7 .1-.3.2-.6.2-1-.2.4 1.7 3.7 2 4.2.4.4 1.2-.1 1.5.3.2.2.9 1.3 1.1 1.5 1.7 1.6 2.7 4 4.9 5.1 0-4.1 1.2-6.3.9-10.1 3.3.6 1-2.5 1.2-4.3.2-1.9 1.5-3.8 3.5-3.6-.8-3.4.3-6.4 2-9.1.8-1.2 1.2-.5 1.8-2.1.3-.8-.2-1.3-.1-2.1.1-.9 0-3.3.3-4.1.7-1.5 2-1.5 2.1-3.3.1-1.4-.7-3.6-.7-5.1.4-4.1-.5-7.4-2.7-11m-44.7-13c-8.9-.9-17.2-3.4-26-5.1-3.9-.8-7.9-1.3-11.6-2.4-2.5-.7-3-.7-1.4-2.8 1.2-1.6 3.6-2.7 5.2-4 3.4-2.6 6.3-5.5 9.4-8.4 3.4-3.2 6.1-6.3 10.1-2.4 5.4 5.3 11.5 10.8 19.6 10.9 2.1 0 4.6-.7 6.4.9 2.4 2.1.3 3.3-1.1 5.6-1.1 1.9-2.2 3.9-3.6 5.6-2.3 2.4-3.9 2.2-7 2.1m8.4 4.8c-1.4-.1-2.7-1-3.7-2 2.7-.6 5.2-.3 6.1 2.6-.7-.2-1.6-.3-2.4-.6"
								/><path
									d="M366.2 105.1c-.9 0-2.3.3-3.2 0-.5-.1-1 .1-1.5 0-.1 0-.2-1.4-.4-1.4-2.1-.1-3.1 3.1-5.7 2.8-1.3-.1-.7-1.2-2.2-1 .1 0-2.3 1.6-2.6 1.7-2.5.9-3.5 1-4.2-1.7-2 1.4-3.3 2.1-5.8 2.1-3.3-.1-2.9-.8-4-4.2-1 .4-2.2 1.1-3.2 1.2-2 .2-.7 0-2.6-.3-1-.2-1.1-.6-2.1-.6-1.1 0-2.5.6-3.5.9.1-1.6.1-3.2.2-4.7-1.1 0-2.9.4-4 0-.8-.3-1.4-1.6-1.9-1.7-1.2-.3-2.9.9-4.1.5-1.1-.3-1.1-1.5-2.1-2-.8-.4-2 .3-2.9-.3-2.1-1.3 0-1.2-.9-2.8-1.6-2.7-3-.9-5.7.4.3-.7.2-1.5.5-2.2-1.1.2-2.3.4-3.4.6 0-.5-.1-.9-.1-1.4-2 1.6-1.7 1.5-3.4 1.3-.6-.1-1.2-1.2-1.8-1.3-.7-.1-1.9.6-2.6.8-4.1.8-4.9-2-4.5-5.7-1.3.7-2.6 1.5-3.9 1.5-.6 0-1.2-1.5-1.9-1.5-.6 0-1.9 1.3-2.4 1.5s-1 .8-1.6 1c-.5.1-1.4-1-1.9-.9-1.7.4-2.7 1.6-4.2 1.9-.6.1-1.4-1-1.9-.9-.7.1-1.1 1.6-1.7 1.9-1.3.6-2.2.9-3.3 0-1.2-1-1.2-3.6-3.2-3.9-1.5-.2-3 2.2-4.5 2.3-2.4.2-1.5-1-3.2.3-1.1.9-1.2 3.3-2.4 4.2-.5.3-1.7-.5-2.3 0s-.4 1.9-.9 2.4c-.2.4-.3.8-.5 1.2-.4 0-.8 0-1.2-.1-.3.3-.9-.2-1.2.2-.5.6-.1 2-.5 2.7s-1 .9-1.3 1.4c-.7 1.4-1.1 2.2-1 4.3 0 1.3.5 2.9.3 4.2 0 .4-1.5.6-1.5 1 0 .7 1 1.9 1.3 2.5-3.2-.7-2.6-1.1-3.8 1.2-.7 1.3-.8 3.2-1.1 4.6-.9 3.6-1.2 6.8-1.1 10.5.1 3.6 1.1 6.3 2.5 9.6 1.4 3.4 2.3 5.5-.2 7.8-5.5 5.1-13.5 6.4-20.1 9.5-4.6 2.1-13.1 8.3-18.2 7.4 1.3 2.6.8 5.4 2.4 8 1.6 2.5 4.1 4.1 6 6.3 4.2 4.6 7.5 10 11.6 14.8 1.4 1.7 5.4 4.2 2.9 5.8-1 .6-3.1-.3-4.3.3-1.1.6-2.2 2.3-3 3.2-2.4 2.5-4.3 5.2-7.4 6.7-2.9 1.4-5.6 3.1-8.5 4.4-3.6 1.7-7 2.3-9.5 5.8-1.6 2.2-4.7 8.1 0 7.5-1.4 1.5-7.4 12.3-2.1 10.7-.2 1.9-.4 3.9-.6 5.8-.2 3 .3 1.8 1.5 3.6.4.6 1.2.6 1.5 1.1 0 .1-.5 1.9-.5 2.2 0 .6 1 1.3 1.1 2 .1.8-.7 2.3-1 3.1 2.2-.5 4.4-.8 6.6-1.1 0 1.3-.6 3.6-.2 4.8.6 1.5 1.2.6 2.5 1.8 1.4 1.3 1.7 5.3 2.6 7.1 2.1-2.3 2.2 2.2 2.3 3.4 5.5-1.6 1.9 2.5 4.4 4.5 2 1.6 3.5-1 5-2.4.1 2.3-.2 2.7 1.4 4 2.1 1.8 2.4 1 4.2-.7.3 1.7.4 4.6 1.3 5.6.2.2 1.9.5 2.4 1 .9.8 1.3 2.4 2.1 3.3 2.5 2.6 6.4 2.6 9.2.1.2 1.1.7 1.9 1.5 2.6 1.4 1.3 2.1.4 3.2 1.1 1.3.9 2.1 2.7 3.8 4 .1-.7.8-1.2.9-1.9 1.8 1.6 3 4.2 5.2 3.4 1.6-.6 2.4-5 3.9-1.5.2-.5 1.2-2.5 1.9-2.5 1 0 .3 3.8.6 4.2.5.6 3.4.9 4.2 1.1.3.1.6-.6.9-.5.9.3 1 1.6 1.9 1.8 1 .2 3.1-.6 4.2-.8-.7 3.1 1.2 1.1 1.8 2.2.4.7.3 2.5.3 3.6 1.4-.3 3.3-1.2 4.6-1.1.1 0 4.9 1.1 4.8 1.1 1.9 1.8-.3 2.8 2.5 3.5.8.2 1.8-.2 2.6 0 .7.2 1 1.1 1.6 1.2.8.2 2.1-.1 2.9.1 1.1.4 1.2 1 2.2 1.6 1.3.8 2.7 1 4.1 1.5 1.1.4.5.2 1.9 1.1.8.5 1.4 1 2.3 1.5 1.5.8 2.9 1.3 4.6 1-2-2.9-3.5-5-6.3-7 3.3-3.3-1-2.1-1-5.1 0-.8 1.3-2 1.4-3 .1-1.1-.3-2.4-.5-3.4-.1-.4-1.2-1.4-1.1-1.9 0-.3.9-.4 1-.7.3-1 1.5-1.3 1.3-3-.2-2.1-2.5-3.9-.9-6.4.5-.8 2.6-.9 3.1-1.6.4-.7-.9-2.2-.9-3.2 0-.9.9-1.6.9-2.4 0-.5-.8-2.9-1-3.6-.7-3.2-.1-2.6 2.1-4.8 2.8-2.7 1.4-3.9-.3-6.7 3.8-1.6.4-4.4.3-8-.1-2.6 1.4-6.2 4.7-5.7-1.6-1.4-3.2-2.8-4.8-4.1l2.1-2.1c-1.4-1.2-2.8-2.3-3.8-3.9.3 0 2.8-.3 2.7-.6-.4-1.1-2.1-1.7-2.5-2.8-.5-1.6.2-1.2.4-2.8.3-2.6-1.3-1.3.7-3.6.4-.5 2.8-1.7 2.9-2.3.3-1.2-2.9-4.7-3.3-5.8 0 0-3.3-8.2-3.9-6.2.2-.5 1.9-.7 1.9-1.3 0-1.6-3.4-2.5-3.3-4 .3-2.6 3.4-2 1.5-5.7-.4-.8-1.4-1.2-1.9-2-.3-.6-.2-2.3-.6-2.6-.9-.9-3.1 0-4.5-1.2.1-.1 1.4-1.4 1-1.5-1.5-.2-3.5 0-4.8-.9-1.6-1.1-.8-3-1.8-3.8-1.9-1.4-7.2 1.5-5.5-3.6-1.1.3-3.3 1.4-4.4 1.2-1.4-.3-1.6-1.8-2.4-1.9-1.3-.2-3.1 1.5-4.4 1.8-1.9.4-2.7-.1-4.5-.5-.7-.1-1.7.3-2.3 0-.5-.3-.5-1.7-1.1-2-1.5-.7-3.8.2-5.3.5-2.9.5-5.5 1.5-8.3 2.6-3 1.2-6 1.6-9.1 2.6-2.7.9-4.1 3-6.5 4.2-1.9.9-1.6 1-3.5-.7-.9-.8-1.5-1.4-2.3-2.3-2.6-2.9-5-6.2-7.4-9.3-3.6-4.5-7.8-8.9-11.2-13.6-2.9-4-.5-3.6 2.9-5.4 2-1.1 3.6-2.7 5.6-3.7 5.9-3 12.6-4.7 18.5-7.7 2.4-1.2 4.4-2.8 6.7-4.2 4.4-2.7 3.4.4 7 2.7 1.7 1.1 4.1.5 5.7 1.4 1.4.8 2.6 3.1 3.3 4.5 1.8 3.8 2.7 8.3 5.7 11.2 1.4 1.4 2.6 2.4 4.2 2.9 1.8.5 3.1.1 5.1 1.3 3.3 1.9 5.1 4.1 8.8 5.3 0-.5.5-1.1.5-1.6.9.4 1.8.7 2.7 1.1.5-3.2 10.2 6.6 8.1-1 1 .4 3.7 2 4.7 1.8 2.4-.4.3-1.6 1.8-2.8 1.3-1 7.3.9 8.8-.5.7-.6-.5-3.1 0-3.9.1-.2 2.6-1.1 3-1.5 1.1-1 1.3-1.9 2.5-2.4 1.4-.6 3.9-.4 5.5-.6-.6-.3-3.3-2.1-3.7-2 1.4-.5 3.3.2 4.6-.5.8-.4 1-1.6 1.9-2 2-1 2 .7 2.7-1.1.9-2.3-2.1-2.4 1.1-4.3 2.7-1.7 4.6-1.8 6.5-4.6.8-1.1 2-2.4 2.5-3.6 1.1-2.4-.2-2-.6-4-.3-1.8-.3-1.7 1.5-3.3.9-.8 1.8-1.6 2.8-2.3 1.3-1 3.1-2 3.9-3.5.4-.7-.4-1.6 0-2.3s1.5-1.2 1.8-1.8c.5-1 .6-2.4 1.4-3.5.4-.6 1.6-.7 2.1-1.4s.5-1.8 1-2.4c1-1.3 5.2-2.6 3.4-5 .8-.2 2.9-.4 3.5-.9.7-.6.5-2.1 1.1-2.9.8-.8 3.2-.9 3.7-1.6.3-.5-.8-1.8-.3-2.2.8-.7 2 .1 3.3-.5.9-.4 1.6-2 2.4-2.6.3-.5 5.9-4 2-3.7"
								/></svg
							>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		{#if !$isStyleEdit && !$showDataMenu}
			<!-- <div class="absolute bottom-[0px] left-[-450px] -z-10 opacity-90 [&_path]:stroke-gray-700">
				<FacCottageSvg width={'1500'} strokeWidth={'0.5'} />
			</div> -->
			<!-- <Icon
				icon="proicons:layers"
				class="absolute bottom-[200px] left-2 -z-10 h-60 w-60 text-gray-700 opacity-50"
			/> -->
		{/if}
		{#if !$isStyleEdit && !$showDataMenu && selectedTab === 'added-data'}
			<!-- <div transition:fade={{ duration: 150 }} class="p-3 max-lg:hidden">
				<LayerControl />
			</div> -->
			<!-- おすすめデータ -->
			<div
				out:fade={{ duration: 100 }}
				in:fade={{ delay: 200, duration: 100 }}
				class="mobile-bottom relative px-2 pb-3 max-lg:hidden"
			>
				<RecommendedData
					bind:showDataEntry
					isLayerDragging={isDraggingLayerType !== null}
					bind:isDeleteOverlayActive
					{setRecommendedDataDragging}
				/>
			</div>
		{/if}
		<!-- <div class="h-[98px] w-full shrink-0"></div> -->
	</div>
{/if}

<style>
	@media (width < 768px) {
		.mobile-bottom {
			padding-bottom: calc(72px + env(safe-area-inset-bottom));
		}
	}
</style>
