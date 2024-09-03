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

<div class="custom-scroll h-full overflow-scroll">
	<div
		class="right-[70px]columns-2 gap-4 bg-black bg-opacity-70 p-4 text-white md:columns-3 lg:columns-4"
	>
		{#each layerDataEntries.filter((layerEntry) => !$addedLayerIds.includes(layerEntry.id)) as layerEntry (layerEntry.id)}
			<div animate:flip={{ duration: 200 }} class="">
				<DataSlot bind:layerEntry />
			</div>
		{/each}
	</div>
</div>

<style>
</style>
