<script lang="ts">
	import Icon from '@iconify/svelte';
	import Compass from '$routes/map/components/map_control/Compass.svelte';
	import GeolocateControl from '$routes/map/components/map_control/GeolocateControl.svelte';
	import StreetViewControl from '$routes/map/components/map_control/StreetViewControl.svelte';
	import TerrainControl from '$routes/map/components/map_control/TerrainControl.svelte';
	import ScaleControl from '$routes/map/components/map_control/ScaleControl.svelte';
</script>

<div class="pointer-events-none absolute h-full w-full lg:hidden">
	<div class="absolute right-4 top-4">
		<Compass />
	</div>

	<div class="absolute bottom-24 right-4 rounded-lg bg-black/50 p-1">
		<StreetViewControl />
		<GeolocateControl />
	</div>

	<div class="bottom-18 absolute left-0 rounded-lg">
		<ScaleControl />
	</div>
</div>

<style>
</style>
