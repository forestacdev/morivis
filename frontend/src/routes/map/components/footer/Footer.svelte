<script lang="ts">
	import Attribution from '$routes/map/components/footer/Attribution.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { mapStore } from '$routes/stores/map';
	import { isPc } from '$routes/map/utils/ui';

	let {
		layerEntries
	}: {
		layerEntries: GeoDataEntry[];
	} = $props();
</script>

<!-- <div class="pointer-events-none absolute bottom-0 left-0 h-[90px] w-full">
	<Attribution />
</div> -->

<style>
</style>
