<script setup lang="ts">
	import { fade } from 'svelte/transition';
	import { isSide, excludeIdsClickLayer } from '$lib/store/store';
	import { createEventDispatcher } from 'svelte';
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker
	} from 'maplibre-gl';

	// export let mapBearing: number;
</script>

{#if $isSide === 'info'}
	<div
		transition:fade={{ delay: 100 }}
		class="custom-overlay absolute bottom-0 flex h-full w-full justify-center bg-white"
	>
		ここにダイアログが表示される
	</div>
{/if}

<style>
	.custom-overlay {
		filter: blur(6px);
		opacity: 0.8;
	}
</style>
