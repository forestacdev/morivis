<script lang="ts">
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker
	} from 'maplibre-gl';
	import { fade } from 'svelte/transition';

	import { isSide, excludeIdsClickLayer } from '$routes/map/store/store';

	// export let mapBearing: number;
</script>

{#if $isSide === 'info'}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 flex h-full w-full items-center justify-center"
	>
		<div class="bg-opacity-8 h-[600px] w-[600px] bg-black">ここにダイアログが表示されるs</div>
	</div>
{/if}

<style>
</style>
