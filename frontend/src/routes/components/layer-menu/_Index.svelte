<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { slide, fly, fade } from 'svelte/transition';

	import Switch from '$routes/components/atoms/Switch.svelte';
	import LayerSlot from '$routes/components/layer-menu/LayerSlot.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { selectedLayerId, isStyleEdit, showDataMenu } from '$routes/store';
	import {
		getLayerType,
		groupedLayerStore,
		showHillshadeLayer,
		typeBreakIndices,
		type LayerType
	} from '$routes/store/layers';
	import { showLabelLayer } from '$routes/store/layers';
	import { isSideMenuType } from '$routes/store/ui';
	import { resetLayersConfirm, showConfirmDialog } from '$routes/store/confirmation';

	interface Props {
		layerEntries: GeoDataEntry[];
		tempLayerEntries: GeoDataEntry[];
		resetlayerEntries: () => void; // レイヤーのリセット関数
	}

	let {
		layerEntries = $bindable(),
		tempLayerEntries = $bindable(),
		resetlayerEntries
	}: Props = $props();
	let layerEntry = $state<GeoDataEntry | undefined>(undefined); // 編集中のレイヤー
	let enableFlip = $state(true); // アニメーションの状態
	let dragEnterType = $state(null); // ドラッグ中のレイヤーのタイプ

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

	// const groupByType = (entries: GeoDataEntry[]) => {
	// 	const groups: { type: LayerType; entries: GeoDataEntry[] }[] = [];

	// 	let currentType: LayerType | undefined = undefined;
	// 	let currentGroup: { type: LayerType; entries: GeoDataEntry[] } | undefined = undefined;

	// 	for (const entry of entries) {
	// 		const type = groupedLayerStore.getType(entry.id); // ← ここで辞書逆引き

	// 		if (type !== currentType) {
	// 			currentType = type;
	// 			currentGroup = { type, entries: [] };
	// 			groups.push(currentGroup);
	// 		}

	// 		currentGroup?.entries.push(entry);
	// 	}

	// 	return groups;
	// };

	// let groupedEntries = $derived.by(() => {
	// 	return groupByType(layerEntries);
	// });
</script>

<!-- レイヤーメニュー -->
{#if $isSideMenuType === 'layer'}
	<div
		transition:fly={{ duration: 300, y: 100, opacity: 0, delay: 100 }}
		class="w-side-menu absolute z-10 flex h-full flex-col gap-2 pt-[70px]"
	>
		<div class="c-scroll flex grow flex-col gap-2 overflow-y-auto overflow-x-hidden px-2 pb-4">
			<div class="elative flex flex-col">
				<Switch label="ラベル表示" bind:value={$showLabelLayer} />
				<Switch label="陰影表示" bind:value={$showHillshadeLayer} />
			</div>

			{#each layerEntries as layerEntry, i (layerEntry.id)}
				<div animate:flip={{ duration: enableFlip ? 200 : 0 }}>
					{#if $typeBreakIndices[i]}
						<!-- この index はタイプの切り替え地点 -->
						<div class="mb-1 mt-4 flex items-center gap-2 border-t p-2 text-base">
							<Icon
								icon={TYPE_ICONS[$typeBreakIndices[i]]}
								class="pointer-events-none"
								width={20}
							/>
							<span class="">{TYPE_LABELS[$typeBreakIndices[i]]}</span>
						</div>
					{/if}
					<LayerSlot
						bind:layerEntry={layerEntries[i]}
						bind:tempLayerEntries
						bind:enableFlip
						bind:dragEnterType
					/>
				</div>
			{/each}
			<div class="h-[200px] w-full shrink-0"></div>
		</div>
		{#if !$isStyleEdit}
			<div
				class="pointer-events-none absolute bottom-0 z-10 flex h-[100px] w-full items-end justify-center gap-2 pb-8"
			>
				{#if !dragEnterType && !$showDataMenu}
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
{/if}

<style>
	.c-fog {
		background: rgb(233, 233, 233);
		background: linear-gradient(0deg, rgb(0, 93, 3) 10%, rgba(233, 233, 233, 0) 100%);
	}
</style>
