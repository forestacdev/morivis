<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { slide, fly } from 'svelte/transition';

	import Switch from '$routes/components/atoms/Switch.svelte';
	import LayerOptionMenu from '$routes/components/layer-menu/layer-option-menu/_Index.svelte';
	import LayerSlot from '$routes/components/layer-menu/LayerSlot.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { selectedLayerId, isEdit, mapMode, showDataMenu } from '$routes/store';
	import { typeBreakIndices } from '$routes/store/layers';
	import { showLabelLayer } from '$routes/store/layers';

	let {
		layerEntries = $bindable(),
		tempLayerEntries = $bindable()
	}: { layerEntries: GeoDataEntry[]; tempLayerEntries: GeoDataEntry[] } = $props();
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

	onMount(() => {});
</script>

<!-- マップのオフセット調整用 -->
{#if $mapMode === 'edit' || $showDataMenu}
	<div
		in:slide={{ duration: 1, delay: 200, axis: 'x' }}
		class="flex h-full shrink-0 flex-col {!$showDataMenu ? 'w-[400px]' : 'w-[90px]'}"
	></div>
{/if}

<!-- レイヤーメニュー -->
{#if $mapMode === 'edit' || $showDataMenu}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main absolute z-30 flex h-full flex-col gap-2 {!$showDataMenu
			? 'w-[400px]'
			: 'w-[90px]'}"
		style:transition="width 0.3s ease"
	>
		{#if !$showDataMenu}
			<div transition:slide={{ duration: 250 }} class="flex items-center justify-between p-2">
				<span class="p-2 text-base text-lg">レイヤー</span>
				<button
					onclick={() => {
						mapMode.set('view');
						isEdit.set(false);
						selectedLayerId.set('');
					}}
					class="bg-base cursor-pointer rounded-full p-2"
				>
					<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
				</button>
			</div>
		{/if}
		<div
			class="c-scroll-hidden flex grow flex-col gap-2 overflow-y-auto overflow-x-hidden px-2 pb-4"
		>
			{#if !$showDataMenu}
				<div class="mb-1 border-t p-2 text-base font-bold"></div>
				<Switch label="ラベル表示" bind:value={$showLabelLayer} />
			{/if}
			{#each layerEntries as layerEntry, i (layerEntry.id)}
				<div animate:flip={{ duration: enableFlip ? 200 : 0 }}>
					{#if $typeBreakIndices[i]}
						<!-- この index はタイプの切り替え地点 -->
						<div
							class="mb-1 mt-4 flex items-center gap-2 border-t p-2 text-base {$showDataMenu
								? 'text-sm'
								: ''}"
						>
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
		<LayerOptionMenu bind:layerEntry bind:tempLayerEntries />
		{#if !$isEdit && !$showDataMenu}
			<div
				class="c-fog pointer-events-none absolute bottom-0 z-10 flex h-[100px] w-full items-end justify-center pb-4"
			>
				{#if !dragEnterType}
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
