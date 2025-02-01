<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import LayerOptionMenu from '$map/components/LayerOptionMenu.svelte';
	import LayerSlot from '$map/components/LayerSlot.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import { selectedLayerId, isEdit, mapMode } from '$map/store';
	import { mapStore } from '$map/store/map';
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

{#if $mapMode === 'edit'}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main absolute z-20 flex h-full w-[400px] flex-col gap-2 p-2"
	>
		<div class="flex items-center justify-between">
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
		<div class="z-20 flex flex-grow flex-col gap-2 overflow-y-auto overflow-x-hidden pb-4">
			{#each filterLayerEntries as _, i (filterLayerEntries[i].id)}
				<div animate:flip={{ duration: 200 }}>
					<LayerSlot bind:layerEntry={filterLayerEntries[i]} {toggleVisible} />
				</div>
			{/each}
		</div>

		<LayerOptionMenu bind:layerToEdit bind:tempLayerEntries />
	</div>
{/if}

<style>
</style>
