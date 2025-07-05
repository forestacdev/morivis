<script lang="ts">
	import Icon from '@iconify/svelte';
	import { flip } from 'svelte/animate';
	import { slide, fly, fade } from 'svelte/transition';

	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import LayerSlot from '$routes/map/components/layer_menu/LayerSlot.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { selectedLayerId, isStyleEdit, showDataMenu } from '$routes/stores';
	import {
		showBoundaryLayer,
		showContourLayer,
		showHillshadeLayer,
		showLoadLayer
	} from '$routes/stores/layers';
	import { showLabelLayer } from '$routes/stores/layers';
	import { isSideMenuType } from '$routes/stores/ui';
	import { resetLayersConfirm, showConfirmDialog } from '$routes/stores/confirmation';
	import { isTerrain3d, mapStore } from '$routes/stores/map';

	import { gsap } from 'gsap';

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

	const TYPE_LABELS = {
		label: 'ラベル',
		point: 'ポイント',
		line: 'ライン',
		polygon: 'ポリゴン',
		raster: 'ラスター'
	};

	const TYPE_ICONS = {
		label: 'mynaui:label-solid',
		point: 'ic:baseline-mode-standby',
		line: 'ic:baseline-polymer',
		polygon: 'ic:baseline-pentagon',
		raster: 'mdi:raster'
	};

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

	const resizeMenu = () => {
		if (container) {
			gsap.to(container, {
				width: isSmall ? '85px' : '400px',
				duration: 0.2,
				ease: 'power2.inOut'
			});
		}
	};

	let isSmall = $derived.by(() => {
		if ($isStyleEdit || $showDataMenu) {
			return true;
		}
		return false;
	});

	$effect(() => {
		if (isSmall) resizeMenu();
	});

	$effect(() => {
		if (container) resizeMenu();
	});

	showDataMenu.subscribe((value) => {
		if (value) {
			isSideMenuType.set('layer');
		}
	});

	let is3d = $state<boolean>(false);
	$effect(() => {
		mapStore.toggleTerrain(is3d);
	});
</script>

<!-- レイヤーメニュー -->

<div
	bind:this={container}
	transition:fly={{ duration: 300, y: 100, opacity: 0, delay: 100 }}
	class="bg-main absolute z-10 flex h-full w-[400px] flex-col gap-2 pt-[70px] transition-transform duration-150 {$isSideMenuType ===
	'layer'
		? 'translate-x-0'
		: '-translate-x-[400px]'}"
>
	<div
		class="flex grow flex-col gap-2 overflow-y-auto overflow-x-hidden pb-4 pl-2 {isSmall
			? 'c-scroll-hidden '
			: 'c-scroll'}"
	>
		{#each layerEntries as layerEntry, i (layerEntry.id)}
			<div animate:flip={{ duration: enableFlip ? 200 : 0 }}>
				<LayerSlot
					{isSmall}
					bind:layerEntry={layerEntries[i]}
					bind:showDataEntry
					bind:tempLayerEntries
					bind:enableFlip
				/>
			</div>
		{/each}
		{#if !isSmall}
			<div transition:slide={{ duration: 200 }} class="elative flex h-[200px] flex-col">
				<Switch label="ラベル" bind:value={$showLabelLayer} />
				<Switch label="道路" bind:value={$showLoadLayer} />
				<Switch label="等高線" bind:value={$showContourLayer} />
				<Switch label="行政区域境界" bind:value={$showBoundaryLayer} />
				<Switch label="陰影" bind:value={$showHillshadeLayer} />
				<Switch label="3D" bind:value={is3d} />
			</div>
		{/if}
		<div class="h-[200px] w-full shrink-0"></div>
	</div>
	{#if !isSmall}
		<div
			class="pointer-events-none absolute bottom-0 z-10 flex h-[100px] w-full items-end justify-center gap-2 pb-8"
		>
			{#if !$showDataMenu}
				<button
					onclick={resetLayers}
					class="c-btn-sub pointer-events-auto flex shrink items-center justify-center gap-2"
				>
					<Icon icon="carbon:reset" class="h-8 w-8" /><span>リセット</span>
				</button>
				<button
					onclick={() => showDataMenu.set(true)}
					class="c-btn-confirm pointer-events-auto flex shrink items-center justify-center gap-2"
				>
					<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" /><span
						>データの追加</span
					>
				</button>
			{/if}
		</div>
	{/if}
</div>
