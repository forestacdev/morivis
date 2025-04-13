<script lang="ts">
	import Compass from './Compass.svelte';

	import Attribution from '$routes/components/footer/Attribution.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { mapStore } from '$routes/store/map';
	import { isPc } from '$routes/utils/ui';

	let zoom = $state(0);

	mapStore.onZoom((z) => {
		if (z) {
			zoom = z;
		}
	});

	mapStore.onInitialized((map) => {
		if (!map) return;
		zoom = map.getZoom();
	});

	let {
		layerEntries
	}: {
		layerEntries: GeoDataEntry[];
	} = $props();
</script>

<!-- PC -->
<div class="absolute bottom-12 right-0 z-20 h-auto w-[200px] bg-main p-2 rounded-l-full text-white text-sm flex gap-2">
	<Compass />
	<div class="text-base font-bold">{zoom.toFixed(1)}</div>
</div>

<!-- Mobile -->

<style>
</style>
