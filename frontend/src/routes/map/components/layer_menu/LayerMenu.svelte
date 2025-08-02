<script lang="ts">
	import Icon from '@iconify/svelte';
	import { flip } from 'svelte/animate';
	import { slide, fly, fade } from 'svelte/transition';

	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import LayerSlot from '$routes/map/components/layer_menu/LayerSlot.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { selectedLayerId, isStyleEdit, showDataMenu, isDebugMode } from '$routes/stores';
	import { showLayerMenu } from '$routes/stores/ui';

	import { showLabelLayer, showXYZTileLayer } from '$routes/stores/layers';
	import { resetLayersConfirm, showConfirmDialog } from '$routes/stores/confirmation';
	import { isTerrain3d, mapStore } from '$routes/stores/map';

	import { gsap } from 'gsap';
	import { getLayerType, type LayerType } from '$routes/map/utils/entries';
	import ContourSvg from '$lib/components/svgs/contour.svelte';

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
	let container = $state<HTMLElement | null>(null); // コンテナ要素

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

	let is3d = $state<boolean>(false);
	$effect(() => {
		mapStore.toggleTerrain(is3d);
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

	let isDraggingLayerType = $state<LayerType | null>(null); // ドラッグ中かどうか
</script>

<!-- レイヤーメニュー -->

<div
	transition:fly={{ duration: 300, y: 100, opacity: 0, delay: 100 }}
	class="absolute z-10 flex h-full flex-col gap-2 overflow-hidden duration-200 {$showLayerMenu
		? 'translate-x-0'
		: '-translate-x-[400px]'} {$isStyleEdit
		? 'translate-x-[75px] bg-transparent delay-150'
		: 'bg-main'}"
	style={`width: ${$showDataMenu ? '80px' : '400px'};transition-property: width, transform, translate, scale, rotate; transition-duration: 0.2s; transition-timing-function: ease-in-out;`}
>
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
				{#each pointEntries as layerEntry, i (layerEntry.id)}
					<div animate:flip={{ duration: enableFlip ? 200 : 0 }}>
						<LayerSlot
							index={i}
							length={pointEntries.length}
							layerType={'point'}
							bind:layerEntry={pointEntries[i]}
							bind:showDataEntry
							bind:tempLayerEntries
							bind:enableFlip
							bind:isDraggingLayerType
						/>
					</div>
				{/each}
			</div>
		{/if}
		<!-- ライン -->
		{#if lineEntries.length > 0}
			<div
				class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'line'
					? 'bg-accent/70'
					: ''}"
			>
				{#each lineEntries as layerEntry, i (layerEntry.id)}
					<div animate:flip={{ duration: enableFlip ? 200 : 0 }}>
						<LayerSlot
							index={i}
							length={lineEntries.length}
							layerType={'line'}
							bind:layerEntry={lineEntries[i]}
							bind:showDataEntry
							bind:tempLayerEntries
							bind:enableFlip
							bind:isDraggingLayerType
						/>
					</div>
				{/each}
			</div>
		{/if}
		<!-- ポリゴン -->
		{#if polygonEntries.length > 0}
			<div
				class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'polygon'
					? 'bg-accent/70'
					: ''}"
			>
				{#each polygonEntries as layerEntry, i (layerEntry.id)}
					<div animate:flip={{ duration: enableFlip ? 200 : 0 }}>
						<LayerSlot
							index={i}
							length={polygonEntries.length}
							layerType={'polygon'}
							bind:layerEntry={polygonEntries[i]}
							bind:showDataEntry
							bind:tempLayerEntries
							bind:enableFlip
							bind:isDraggingLayerType
						/>
					</div>
				{/each}
			</div>
		{/if}
		<!-- ラスター -->
		{#if rasterEntries.length > 0}
			<div
				class="rounded-lg transition-colors duration-150 {isDraggingLayerType === 'raster'
					? 'bg-accent/70'
					: ''}"
			>
				{#each rasterEntries as layerEntry, i (layerEntry.id)}
					<div animate:flip={{ duration: enableFlip ? 200 : 0 }}>
						<LayerSlot
							index={i}
							length={rasterEntries.length}
							layerType={'raster'}
							bind:layerEntry={rasterEntries[i]}
							bind:showDataEntry
							bind:tempLayerEntries
							bind:enableFlip
							bind:isDraggingLayerType
						/>
					</div>
				{/each}
			</div>
		{/if}

		<!-- 余白 -->
		<div class="h-[150px] w-full shrink-0"></div>
	</div>
	<div class="absolute -bottom-[100px] -left-[100px] -z-10 opacity-90 [&_path]:stroke-gray-700">
		<ContourSvg width={'1000'} strokeWidth={'0.5'} />
	</div>
	<div
		class="border-1 mx-2 flex items-center justify-between gap-2 rounded-lg border-gray-500/50 bg-black p-2"
	>
		<Switch label="地名・道路など" bind:value={$showLabelLayer} />
		<!-- <Switch label="3D地形" bind:value={is3d} /> -->
		{#if $isDebugMode}
			<Switch label="タイル座標" bind:value={$showXYZTileLayer} />
		{/if}
		<button
			onclick={resetLayers}
			class="c-btn-sub pointer-events-auto flex items-center justify-center gap-2 p-1"
		>
			<Icon icon="carbon:reset" class="h-6 w-6" />
		</button>
	</div>
	<!-- {#if !$isStyleEdit && !$showDataMenu}
		<div transition:fade={{ duration: 150 }} class="">
			<Switch label="地名・道路など" bind:value={$showLabelLayer} />
			{#if $isDebugMode}
				<Switch label="タイル座標" bind:value={$showXYZTileLayer} />
			{/if}
			<button
				onclick={resetLayers}
				class="c-btn-sub pointer-events-auto flex shrink items-center justify-center gap-2"
			>
				<Icon icon="carbon:reset" class="h-6 w-6" />
			</button>
		</div>
	{/if} -->
	<div class="h-[98px] w-full shrink-0"></div>
</div>
