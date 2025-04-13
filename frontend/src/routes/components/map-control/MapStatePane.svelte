<script lang="ts">
	import Compass from './Compass.svelte';

	import GeolocateControl from '$routes/components/map-control/GeolocateControl.svelte';
	import ScaleControl from '$routes/components/map-control/ScaleControl.svelte';
	import StreetViewControl from '$routes/components/map-control/StreetViewControl.svelte';
	import ZoomControl from '$routes/components/map-control/ZoomControl.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import { mapStore } from '$routes/store/map';
	import { isPc } from '$routes/utils/ui';

	let zoom = $state(0);
	let isHover = $state(false);

	mapStore.onZoom((z) => {
		if (z) {
			zoom = z;
		}
	});

	mapStore.onInitialized((map) => {
		if (!map) return;
		zoom = map.getZoom();
	});
</script>

<!-- PC -->
<div class="absolute bottom-32 right-2 z-10 flex flex-col gap-2 p-2">
	<StreetViewControl />
	<GeolocateControl />
</div>

<div
	class="bg-main absolute bottom-12 right-0 z-20 flex h-auto gap-2 rounded-l-full p-2 text-sm text-white transition-all duration-200 {isHover
		? 'w-[250px] opacity-100'
		: 'w-[150px] opacity-80'}"
	onmouseenter={() => (isHover = true)}
	onmouseleave={() => (isHover = false)}
	role="button"
	tabindex="0"
>
	<Compass bind:isHover />
	<div class="flex flex-col gap-2">
		<div class="text-base font-bold">{zoom.toFixed(1)}</div>
		<!-- {#if isHover}
			<ZoomControl />
		{/if} -->
	</div>
</div>

<!-- Mobile -->

<style>
</style>
