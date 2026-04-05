<script lang="ts">
	import Icon from '@iconify/svelte';
	import { tick } from 'svelte';
	import { slide, fly, fade } from 'svelte/transition';

	// import LayerSlot from '$routes/map/components/layer_menu/LayerSlot.svelte';
	import RecommendedData from './RecommendedData.svelte';
	import LayerTypeItem from '$routes/map/components/layer_menu/LayerTypeItem.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { getLayerType, type LayerType } from '$routes/map/utils/entries';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';
	import { resetLayersConfirm } from '$routes/stores/confirmation';
	import { activeLayerIdsStore } from '$routes/stores/layers';
	import { showLayerMenu, showDataMenu, isMobile, isActiveMobileMenu } from '$routes/stores/ui';

	interface Props {
		layerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null; // データメニューの表示状態
		tempLayerEntries: GeoDataEntry[];
		featureMenuData: FeatureMenuData | null;
		resetlayerEntries: () => void; // レイヤーのリセット関数
	}

	let {
		layerEntries = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(), // データメニューの表示状態
		featureMenuData = $bindable(),
		resetlayerEntries
	}: Props = $props();
	let enableFlip = $state(true); // アニメーションの状態

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
		return lastEntry ? getLayerType(lastEntry) : null;
	});

	let isDraggingLayerType = $state<LayerType | null>(null); // ドラッグ中かどうか
	let isHoveredLayerType = $state<LayerType | null>(null); // ホバー中かどうか

	let isTouchDragging = $state(false); // タッチデバイスでのドラッグ中かどうか
	let scrollContainer = $state<HTMLElement | undefined>(undefined);

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
			? 'bg-transparent delay-150 max-lg:translate-x-full lg:translate-x-[90px]'
			: 'bg-main'}
             {$showDataMenu ? 'max-lg:w-[0px] lg:w-[80px]' : 'lg:w-side-menu max-lg:w-full'}"
		style="padding-top: env(safe-area-inset-top);"
	>
		<div class="pl-2">
			<div class="relative flex h-[90px] w-full items-center max-lg:hidden">
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
						class="flex shrink-0 flex-col justify-center text-base select-none max-lg:hidden"
					>
						<span class="text-[2.7rem]">morivis</span>
						<div class="pl-1 text-sm text-gray-400">追加済みのデータ</div>
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
			class="relative flex h-full flex-col overflow-x-hidden {!$showDataMenu && !$isStyleEdit
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
			</div>
			<!-- フォグ -->
			{#if !$isStyleEdit && !$showDataMenu}
				<div
					class="c-bg-fog-bottom pointer-events-none absolute bottom-0 z-10 h-[100px] w-full"
				></div>
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
		{#if !$isStyleEdit && !$showDataMenu}
			<!-- <div transition:fade={{ duration: 150 }} class="p-3 max-lg:hidden">
				<LayerControl />
			</div> -->
			<!-- おすすめデータ -->
			<div
				transition:fade={{ duration: 150 }}
				class="mobile-bottom relative px-2 py-3 max-lg:hidden"
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
