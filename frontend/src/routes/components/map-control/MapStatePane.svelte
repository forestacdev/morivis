<script lang="ts">
	import Compass from './Compass.svelte';

	import GeolocateControl from '$routes/components/map-control/GeolocateControl.svelte';
	import StreetViewControl from '$routes/components/map-control/StreetViewControl.svelte';
	import TerrainControl from '$routes/components/map-control/TerrainControl.svelte';
	import { mapStore } from '$routes/store/map';

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
<!-- <div class="absolute bottom-32 right-2 flex flex-col gap-2 p-2">
	<StreetViewControl />
	<TerrainControl />
	<GeolocateControl />
</div> -->

<div
	class="bg-main absolute bottom-12 right-0 flex h-auto w-[150px] gap-2 rounded-l-full p-2 text-sm text-white transition-opacity duration-200 {isHover
		? 'opacity-100'
		: 'opacity-80'}"
	onmouseenter={() => (isHover = true)}
	onmouseleave={() => (isHover = false)}
	role="button"
	tabindex="0"
>
	<Compass bind:isHover />
	<div class="flex flex-col gap-2">
		<div class="text-base font-bold">{zoom.toFixed(1)}</div>
	</div>
</div>

<style>
</style>
