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
	<div class="c-fog pointer-events-none absolute bottom-0 left-0 h-[50px] w-full">
		<Attribution />
	</div>
{:else}
	<!-- Mobile -->
	<div class="bottom-0 left-0 flex h-[70px] w-full grow items-center justify-start gap-2"></div>
{/if}

<style>
	.c-fog {
		background: rgb(233, 233, 233);
		background: linear-gradient(0deg, rgb(0, 0, 0, 0.6) 0%, rgba(233, 233, 233, 0) 100%);
	}
</style>
