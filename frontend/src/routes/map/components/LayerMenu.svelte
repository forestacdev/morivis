<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import LayerSlot from '$map/components/LayerSlot.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import { isSide, showLayerOptionId } from '$map/store';
	import { mapStore } from '$map/store/map';
	let { layerEntries = $bindable() }: { layerEntries: GeoDataEntry[] } = $props();

	let isEdit = $state(true);

	let filterLayerEntries = $derived.by(() => {
		if (isEdit) {
			return layerEntries.filter((layerEntry) => layerEntry.id === $showLayerOptionId);
		} else {
			return layerEntries;
		}
	});

	// TODO エラー チェックをすると
	const toggleVisible = (id: string) => {
		const layer = layerEntries.find((layer) => layer.id === id);
		if (!layer) return;
		layer.style.visible = !layer.style.visible;
	};

	onMount(() => {
		// 初期のMapbox式を受け取り、オブジェクト形式に変換する
		// isSide.set('base');
	});
</script>

{#if $isSide === 'layer'}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main absolute z-10 flex h-full w-[300px] flex-col gap-2 p-2"
	>
		{$showLayerOptionId}

		<input type="checkbox" bind:checked={isEdit} />
		<div class="flex items-center justify-between">
			<span>レイヤー</span>
			<button onclick={() => isSide.set(null)} class="bg-base rounded-full p-2">
				<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
			</button>
		</div>
		<div class="flex flex-grow flex-col gap-2 overflow-y-auto pb-4">
			{#each filterLayerEntries as _, i (filterLayerEntries[i].id)}
				<div
					animate:flip={{ duration: 200 }}
					in:fade={{ duration: 200 }}
					out:fade={{ duration: 200 }}
				>
					<LayerSlot bind:layerEntry={filterLayerEntries[i]} {toggleVisible} />
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
</style>
