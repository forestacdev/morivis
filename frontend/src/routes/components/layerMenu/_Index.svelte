<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import LayerOptionMenu from '$routes/components/layerMenu/layerOptionMenu/_Index.svelte';
	import LayerSlot from '$routes/components/layerMenu/LayerSlot.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { selectedLayerId, isEdit, mapMode, showDataMenu } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	let {
		layerEntries = $bindable(),
		tempLayerEntries = $bindable()
	}: { layerEntries: GeoDataEntry[]; tempLayerEntries: GeoDataEntry[] } = $props();
	let layerToEdit = $state<GeoDataEntry | undefined>(undefined); // 編集中のレイヤー
	let enableFlip = $state(true); // アニメーションの状態

	// TODO チェックをすると警告が出る
	const toggleVisible = (id: string) => {
		const layer = layerEntries.find((layer) => layer.id === id);
		if (!layer) return;
		layer.style.visible = !layer.style.visible;
	};
	// 編集中のレイヤーの取得
	selectedLayerId.subscribe((id) => {
		if (!id) {
			layerToEdit = undefined;
			return;
		} else {
			layerToEdit = layerEntries.find((entry) => entry.id === id);
		}
	});

	onMount(() => {});
</script>

<!-- マップのオフセット調整用 -->
{#if $mapMode === 'edit' || $showDataMenu}
	<div
		in:slide={{ duration: 1, delay: 200, axis: 'x' }}
		class="flex h-full flex-shrink-0 flex-col {!$showDataMenu ? 'w-[400px]' : 'w-[90px]'}"
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
			<div transition:slide={{ duration: 250 }} class="flex items-center justify-between">
				<span class="text-lg">レイヤー</span>
				<button
					onclick={() => {
						mapMode.set('view');
						isEdit.set(false);
						selectedLayerId.set('');
					}}
					class="bg-base rounded-full p-2"
				>
					<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
				</button>
			</div>
		{/if}
		<div
			class="c-scroll-hidden flex flex-grow flex-col gap-2 overflow-y-auto overflow-x-hidden px-2 pb-4"
		>
			{#each layerEntries as layerEntry, i (layerEntry.id)}
				<div animate:flip={{ duration: enableFlip ? 200 : 0 }}>
					<LayerSlot
						bind:layerEntry={layerEntries[i]}
						bind:tempLayerEntries
						{toggleVisible}
						bind:enableFlip
					/>
				</div>
			{/each}
			<div class="h-[200px] w-full flex-shrink-0"></div>
		</div>
		<LayerOptionMenu bind:layerToEdit bind:tempLayerEntries />
		{#if !$isEdit && !$showDataMenu}
			<div
				class="c-fog pointer-events-none absolute bottom-0 z-10 flex h-[200px] w-full items-end justify-center pb-4"
			>
				<button
					onclick={() => showDataMenu.set(true)}
					class="c-btn-confirm pointer-events-auto flex flex-shrink items-center justify-center gap-2"
				>
					<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" /><span
						>データの追加</span
					>
				</button>
			</div>

			<!-- <div class="z-20 flex justify-center">
				<button
					onclick={() => showDataMenu.set(true)}
					class="c-btn-confirm flex items-center justify-center gap-2"
				>
					<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" /><span
						>データの追加</span
					>
				</button>
			</div> -->
		{/if}
	</div>
{/if}

<style>
	.c-fog {
		background: rgb(233, 233, 233);
		background: linear-gradient(0deg, rgba(233, 233, 233, 1) 10%, rgba(233, 233, 233, 0) 100%);
	}
</style>
