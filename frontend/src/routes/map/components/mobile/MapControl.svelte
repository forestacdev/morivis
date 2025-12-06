<script lang="ts">
	import Icon from '@iconify/svelte';
	import Compass from '$routes/map/components/map_control/Compass.svelte';
	import GeolocateControl from '$routes/map/components/map_control/GeolocateControl.svelte';
	import StreetViewControl from '$routes/map/components/map_control/StreetViewControl.svelte';
	import TerrainControl from '$routes/map/components/map_control/TerrainControl.svelte';
	import ScaleControl from '$routes/map/components/map_control/ScaleControl.svelte';
</script>

<div class="pointer-events-none absolute h-full w-full lg:hidden">
	<div
		class="absolute right-4 rounded-lg bg-black/50 p-1"
		style="top: calc(16px + env(safe-area-inset-top));"
	>
		<StreetViewControl />
		<GeolocateControl />
	</div>

	<!-- <div
		class="absolute right-4 rounded-lg bg-black/50 p-1"
		style="bottom: calc(96px + env(safe-area-inset-bottom));"
	>
		<StreetViewControl />
		<GeolocateControl />
	</div> -->

	<div class="absolute bottom-18 left-0 rounded-lg">
		<ScaleControl />
	</div>
</div>

<style>
</style>
