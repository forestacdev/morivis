<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { fade, slide, fly } from 'svelte/transition';

	import LayerSlot from '$map/components/LayerSlot.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import { isSide } from '$map/store';
	import { mapStore } from '$map/store/map';
	let { layerEntries = $bindable() }: { layerEntries: GeoDataEntry[] } = $props();

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
		<div class="flex items-center justify-between">
			<span>レイヤー</span>
			<button onclick={() => isSide.set(null)} class="bg-base rounded-full p-2">
				<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
			</button>
		</div>
		<div class="flex flex-grow flex-col gap-2 overflow-y-auto pb-4">
			{#each layerEntries as layerEntry, i (layerEntry.id)}
				<LayerSlot bind:layerEntry={layerEntries[i]} />
			{/each}
		</div>
	</div>
{/if}

<style>
</style>
