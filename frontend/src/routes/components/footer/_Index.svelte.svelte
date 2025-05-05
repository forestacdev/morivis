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

<div class="c-fog pointer-events-none absolute bottom-0 left-0 h-[70px] w-full">
	<Attribution />
</div>

<style>
	.c-fog {
		background: linear-gradient(
			0deg,
			rgba(0, 0, 0, 0.6) 0%,

			rgba(0, 0, 0, 0) 100%
		);
		/* background: #000; */
	}
</style>
