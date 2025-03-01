<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import LayerSlot from '$map/components/layerMenu/LayerSlot.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import { selectedLayerId, isEdit, mapMode, showDataMenu } from '$map/store';
	import { mapStore } from '$map/store/map';
	import LayerOptionMenu from '$routes/map/components/layerMenu/layerOptionMenu/_Index.svelte';
	let {
		layerEntries = $bindable(),
		tempLayerEntries = $bindable()
	}: { layerEntries: GeoDataEntry[]; tempLayerEntries: GeoDataEntry[] } = $props();
	let layerToEdit = $state<GeoDataEntry | undefined>(undefined); // 編集中のレイヤー

	// レイヤー表示のフィルタリング（編集時）
	let filterLayerEntries = $derived.by(() => {
		if ($isEdit) {
			return layerEntries.filter((layerEntry) => layerEntry.id === $selectedLayerId);
		} else {
			return layerEntries;
		}
	});

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
		class="bg-main absolute z-30 flex h-full flex-col gap-2 p-2 {!$showDataMenu
			? 'w-[400px]'
			: 'w-[90px]'}"
		style:transition="width 0.3s ease"
	>
		{#if !$showDataMenu}
			<div transition:slide={{ duration: 250 }} class="flex items-center justify-between">
				<span>レイヤー</span>
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
		<div class="z-20 flex flex-grow flex-col gap-2 overflow-y-auto overflow-x-hidden pb-4">
			{#each filterLayerEntries as _, i (filterLayerEntries[i].id)}
				<div animate:flip={{ duration: 200 }}>
					<LayerSlot bind:layerEntry={filterLayerEntries[i]} {toggleVisible} />
				</div>
			{/each}
		</div>

		<LayerOptionMenu bind:layerToEdit bind:tempLayerEntries />
		{#if !$isEdit && !$showDataMenu}
			<div class="flex justify-center">
				<button
					onclick={() => showDataMenu.set(true)}
					class="c-btn-confirm flex items-center justify-center gap-2"
				>
					<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" /><span
						>データの追加</span
					>
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
</style>
