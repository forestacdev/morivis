<script setup lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker
	} from 'maplibre-gl';

	const dispatch = createEventDispatcher();
	const setMapBearing = (e: any) => {
		const mapBearing = e.target.value;
		dispatch('setMapBearing', mapBearing);
	};

	const setMapZoom = (e: any) => {
		const mapZoom = e.target.value;
		dispatch('setMapZoom', mapZoom);
	};

	// export let mapBearing: number;
</script>

<div class="bg-white　bottom-0 absolute flex h-[20px] w-full justify-center">
	<input type="range" min="-180" max="180" step="15" value="0" on:input={setMapBearing} />
	<input type="range" min="7" max="22" step="0.5" value="14" on:input={setMapZoom} />
</div>

<!-- <div class="bg-color-base flex max-w-md flex-col gap-4 p-3 text-slate-100">
	{#if feature.feature}
		{#each Object.keys(feature.feature.properties) as key}
			<div class="flex gap-2">
				<span>{key}</span>
				<span>{feature.feature.properties[key]}</span>
			</div>
		{/each}
	{/if}
</div> -->

<style>
</style>
