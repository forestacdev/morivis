<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onDestroy } from 'svelte';
	import { tick } from 'svelte';
	import { slide, fly, fade } from 'svelte/transition';

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

	$effect(() => {
		const [lng, lat] = mapState.center;

		if (!isInJapanBounds || mapState.zoom <= 5) {
			prefectureCode = '';
			prefectureCodeError = false;
			return;
		}

		const requestId = ++prefectureRequestId;
		prefectureCodeError = false;

		lonLatToPrefectureCode(lng, lat)
			.then((code) => {
				if (requestId !== prefectureRequestId) return;
				prefectureCode = code as PrefectureCode;
			})
			.catch(() => {
				if (requestId !== prefectureRequestId) return;
				prefectureCodeError = true;
			});
	});

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
		unsubscribeMapState();
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
		ondragover={(e) => e.preventDefault()}
		ondrop={(e) => {
			e.preventDefault();
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
			<div class="relative flex h-[100px] w-full items-center max-lg:hidden">
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
						<span class="text-[2.7rem]">morivis</span>
						<div class="flex w-full items-center py-2">
							<div class="flex flex-1 gap-2">
								<label
									class="cursor-pointer rounded-lg p-1 px-4 text-xs transition-colors {selectedTab ===
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
									追加済みデータ
								</label>
								<label
									class="cursor-pointer rounded-lg p-1 px-4 text-xs transition-colors {selectedTab ===
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
									地図表示
								</label>
							</div>
							<!-- <button
								class="bg-base ml-auto cursor-pointer rounded-lg p-1 px-2 text-xs text-black"
								onclick={resetLayers}
								>リセット
							</button> -->
						</div>
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
			<!-- スクロールコンテンツ -->
			<div
				bind:this={scrollContainer}
				class="flex h-full flex-col overflow-x-hidden pl-2 {$showDataMenu || $isStyleEdit
					? 'c-scroll-hidden'
					: 'c-scroll-hidden'} {isTouchDragging
					? 'touch-none overflow-hidden'
					: 'touch-auto overflow-y-auto'}"
			>
				<!-- 3Dモデル -->
				{#if selectedTab === 'added-data'}
					{#if modelEntries.length > 0}
						<div
							class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'model'
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
							/>
						</div>
					{/if}
					<!-- ポイント -->
					{#if pointEntries.length > 0}
						<div
							class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'point'
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
							/>
						</div>
					{/if}
					<!-- ライン -->
					{#if lineEntries.length > 0}
						<div
							class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'line'
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
							/>
						</div>
					{/if}
					<!-- ポリゴン -->
					{#if polygonEntries.length > 0}
						<div
							class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'polygon'
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
							/>
						</div>
					{/if}
					<!-- ラスター -->
					{#if rasterEntries.length > 0}
						<div
							class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'raster'
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
							/>
						</div>
					{/if}

					<!-- 余白 -->
					<div class="h-[100px] w-full shrink-0"></div>
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
					<div class="absolute -z-10 grid h-full w-full items-end justify-center opacity-[4%]">
						{#key backgroundKey}
							<div
								in:fly={{ duration: 500, y: 20 }}
								out:fly={{ duration: 500 }}
								class="absolute grid aspect-square w-full translate-y-[20px] place-items-center px-6"
							>
								{#if isInFacView}
									<div class="grid aspect-square place-items-center [&_path]:fill-white">
										<FacIcon width={'100%'} />
									</div>
								{:else if prefectureCode}
									<div class="[&_path]:fill-base grid aspect-square w-full place-items-center">
										<PrefectureIcon width={'100%'} code={prefectureCode} />
									</div>
								{:else if isInJapanView || prefectureCodeError}
									<Icon icon="emojione-monotone:map-of-japan" class="h-full w-full text-base" />
								{:else}
									<Icon icon="fxemoji:worldmap" class="[&_path]:fill-base h-full w-full" />
								{/if}
							</div>
						{/key}
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
				<RecommendedData bind:showDataEntry />
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
