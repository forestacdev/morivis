<script lang="ts">
	import Attribution from '$routes/components/footer/Attribution.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { mapStore } from '$routes/store/map';
	import { isPc } from '$routes/utils/ui';

	let {
		layerEntries
	}: {
		layerEntries: GeoDataEntry[];
	} = $props();
</script>

{#if isPc()}
	<!-- PC -->
	<div
		class="pointer-events-none absolute bottom-0 left-0 z-20 flex h-[40px] w-full flex-grow items-center justify-start gap-2"
	>
		<Attribution />
	</div>
{:else}
	<!-- Mobile -->
	<div
		class="bottom-0 left-0 flex h-[70px] w-full flex-grow items-center justify-start gap-2"
	></div>
{/if}

<style>
</style>
