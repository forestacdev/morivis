<script lang="ts">
	import Icon from '@iconify/svelte';
	import { flip } from 'svelte/animate';
	import { slide, fly, fade } from 'svelte/transition';

	// import LayerSlot from '$routes/map/components/layer_menu/LayerSlot.svelte';
	import LayerTypeItem from '$routes/map/components/layer_menu/LayerTypeItem.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { selectedLayerId, isStyleEdit, isDebugMode } from '$routes/stores';
	import { showLayerMenu, showDataMenu, isMobile, isActiveMobileMenu } from '$routes/stores/ui';

	import { resetLayersConfirm } from '$routes/stores/confirmation';
	import LayerControl from '$routes/map/components/layer_menu/LayerControl.svelte';

	import { getLayerType, type LayerType } from '$routes/map/utils/entries';
	import RecommendedData from './RecommendedData.svelte';

	interface Props {
		layerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null; // データメニューの表示状態
		tempLayerEntries: GeoDataEntry[];
		resetlayerEntries: () => void; // レイヤーのリセット関数
	}

	let {
		layerEntries = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(), // データメニューの表示状態
		resetlayerEntries
	}: Props = $props();
	let layerEntry = $state<GeoDataEntry | undefined>(undefined); // 編集中のレイヤー
	let enableFlip = $state(true); // アニメーションの状態

	// 編集中のレイヤーの取得
	selectedLayerId.subscribe((id) => {
		if (!id) {
			layerEntry = undefined;
			return;
		} else {
			layerEntry = layerEntries.find((entry) => entry.id === id);
		}
	});

	// レイヤーのリセット処理
	const resetLayers = async () => {
		const result = await resetLayersConfirm();

		if (result) {
			resetlayerEntries();
		}
	};

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

	let isDraggingLayerType = $state<LayerType | null>(null); // ドラッグ中かどうか

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
		class="transition-[width, transform, translate, scale] absolute z-10 flex h-full flex-col overflow-hidden duration-200 {$showLayerMenu
			? 'translate-x-0'
			: '-translate-x-[400px]'} {$isStyleEdit
			? 'bg-transparent delay-150 max-lg:translate-x-full lg:translate-x-[90px]'
			: 'bg-main'}
             {$showDataMenu ? 'max-lg:w-[0px] lg:w-[80px]' : 'lg:w-side-menu max-lg:w-full'}"
		style="padding-top: env(safe-area-inset-top);"
	>
		<div class="pl-2">
			<div class="relative flex h-[64px] w-full items-center max-lg:hidden">
				{#if !$isStyleEdit && !$showDataMenu}
					<div
						transition:slide={{ duration: 200, axis: 'x' }}
						class="relative grid h-full w-[50px] shrink-0 place-items-center"
					>
						<div class="bg-base/60 h-full w-[2px]"></div>
					</div>
				{/if}

				{#if !$isStyleEdit && !$showDataMenu}
					<div
						transition:slide={{ duration: 200, axis: 'x' }}
						class="flex shrink-0 select-none items-center justify-center text-base max-lg:hidden"
					>
						<span class="text-[2.7rem]">morivis</span>
					</div>
				{/if}

				{#if $showDataMenu}
					<div class="grid w-full shrink-0 place-items-center">
						<button
							transition:slide={{ duration: 200, axis: 'x' }}
							onclick={() => {
								$showDataMenu = false;
							}}
							class="bg-base grid shrink-0 cursor-pointer place-items-center rounded-full p-2"
						>
							<Icon icon="ep:back" class="h-6 w-6" />
						</button>
					</div>
				{/if}
			</div>
		</div>
		<div
			class="flex h-full flex-col overflow-y-auto overflow-x-hidden pl-2 {$showDataMenu ||
			$isStyleEdit
				? 'c-scroll-hidden '
				: 'c-scroll'}"
		>
			<!-- ポイント -->
			{#if pointEntries.length > 0}
				<div
					class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'point'
						? 'bg-accent/70'
						: ''}"
				>
					<LayerTypeItem
						layerType={'point'}
						typeEntries={pointEntries}
						bind:showDataEntry
						bind:tempLayerEntries
						bind:enableFlip
						bind:isDraggingLayerType
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
						typeEntries={lineEntries}
						bind:showDataEntry
						bind:tempLayerEntries
						bind:enableFlip
						bind:isDraggingLayerType
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
						typeEntries={polygonEntries}
						bind:showDataEntry
						bind:tempLayerEntries
						bind:enableFlip
						bind:isDraggingLayerType
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
						typeEntries={rasterEntries}
						bind:showDataEntry
						bind:tempLayerEntries
						bind:enableFlip
						bind:isDraggingLayerType
					/>
				</div>
			{/if}

			<!-- TODO:調整 -->
			<div class="relative flex h-[60px] w-full items-center">
				<!-- アイコン -->
				{#if !$isStyleEdit && !$showDataMenu}
					<div
						transition:slide={{ duration: 200, axis: 'x' }}
						class="relative grid h-full w-[50px] shrink-0 place-items-center"
					>
						<button
							onclick={resetLayers}
							class="c-btn-sub bg-sub peer peer pointer-events-auto absolute aspect-square translate-y-[10px] rounded-full p-1.5"
						>
							<Icon icon="carbon:reset" class="h-6 w-6" />
						</button>

						<div
							class="bg-base pointer-events-none absolute -bottom-5 z-10 w-[60px] rounded-full px-1 text-center text-xs opacity-0 transition-opacity duration-200 peer-hover:opacity-100"
						>
							リセット
						</div>
						<div class="bg-base/60 h-full w-[2px]"></div>
					</div>
				{/if}
				<!-- 追加ボタン -->
				<button
					onclick={() => {
						if ($isStyleEdit) {
							isStyleEdit.set(false);
							selectedLayerId.set('');
						} else {
							showDataMenu.set(!$showDataMenu);
							if ($isMobile) {
								// モバイルの場合の処理
								isActiveMobileMenu.set('data');
							}
						}
					}}
					class="translate-z-0 transform-[width, transform, translate, scale, rotate, height, background] relative flex translate-y-[10px] cursor-pointer select-none justify-center text-clip text-nowrap rounded-full p-2 text-left duration-200 {$showDataMenu
						? 'w-[66px]'
						: $isStyleEdit
							? 'w-[400px]'
							: 'hover:bg-accent bg-main max-lg:w-full lg:w-[330px]'} {!$isStyleEdit &&
					!$showDataMenu
						? 'not-hover:drop-shadow-[0_0_2px_rgba(220,220,220,0.8)] opacity-100'
						: 'opacity-0'}"
				>
					<div class="flex w-full items-center justify-start gap-2 bg-transparent">
						<!-- アイコン -->
						<div
							class="relative isolate grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full transition-transform duration-150 {!$showDataMenu &&
							!$isStyleEdit
								? 'bg-accent text-base'
								: 'bg-base text-main'} {$isStyleEdit ? 'translate-x-[320px]' : ''}"
						>
							{#if !$showDataMenu && !$isStyleEdit}
								<Icon icon="material-symbols:add" width={30} />
							{:else}
								<Icon icon="ep:back" class="h-7 w-7" />
							{/if}
						</div>
						<!-- ボタン -->
						<div
							class="relative flex w-full grow flex-col items-center justify-center gap-[2px] overflow-hidden pr-6 text-white"
						>
							{#if !$showDataMenu}
								<span class="text-lg">データの追加</span>
							{/if}
						</div>
					</div>
				</button>
			</div>

			<!-- 余白 -->
			<div class="h-[150px] w-full shrink-0"></div>
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
			<div transition:fade={{ duration: 150 }} class="max-lg:pb-18 p-3">
				<RecommendedData bind:showDataEntry />
			</div>
		{/if}
		<!-- <div class="h-[98px] w-full shrink-0"></div> -->
	</div>
{/if}
