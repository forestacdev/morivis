<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import LayerSlot from '$map/components/LayerSlot.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import { mapStore } from '$map/store/map';
	let { layerEntries = $bindable() }: { layerEntries: GeoDataEntry[] } = $props();

	onMount(() => {
		// 初期のMapbox式を受け取り、オブジェクト形式に変換する
		// isSide.set('base');
	});
</script>

<div class="bg-main absolute z-10 flex h-full w-[270px] flex-col gap-2 p-2">
	{#each layerEntries as layerEntry, i (layerEntry.id)}
		<LayerSlot bind:layerEntry={layerEntries[i]} />
	{/each}
</div>

<style>
</style>
