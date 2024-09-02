<script lang="ts">
	import Icon from '@iconify/svelte';
	import gsap from 'gsap';
	import { onMount } from 'svelte';

	import DataSlot from '$lib/components/ui/datamenu/DataSlot.svelte';
	import type { LayerEntry } from '$lib/data/types';
	import { isSide } from '$lib/store/store';
	import { flip } from 'svelte/animate';
	import { addedLayerIds } from '$lib/store/store';
	export let layerDataEntries: LayerEntry[] = [];

	onMount(() => {});
</script>

<div class="flex flex-col gap-y-2">
	{#each layerDataEntries.filter((layerEntry) => !$addedLayerIds.includes(layerEntry.id)) as layerEntry (layerEntry.id)}
		<div animate:flip={{ duration: 200 }} class="">
			ssss
			<DataSlot bind:layerEntry />
		</div>
	{/each}
</div>

<style>
</style>
