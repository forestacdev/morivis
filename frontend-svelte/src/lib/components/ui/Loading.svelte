<script setup lang="ts">
	import { fade } from 'svelte/transition';
	import { isSide } from '$lib/store/store';
	import { mapStore } from '$lib/store/map';
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker
	} from 'maplibre-gl';

	let isLoading = false;

	// export let mapBearing: number;
	onMount(() => {
		const onLoading = mapStore.onLoading((val) => {
			isLoading = val;
		});
		return () => {
			onLoading();
		};
	});
</script>

{#if isLoading}
	<div
		transition:fade={{ duration: 100 }}
		class="pointer-events-none absolute bottom-0 flex h-full w-full items-center justify-center"
	>
		<div class="bg-opacity-8 w-[600px h-[600px]">読み込み中・・・</div>
	</div>
{/if}

<style>
</style>
