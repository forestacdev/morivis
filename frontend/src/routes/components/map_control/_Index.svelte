<script lang="ts">
	import GeolocateControl from '$routes/components/map_control/GeolocateControl.svelte';
	import ScaleControl from '$routes/components/map_control/ScaleControl.svelte';
	import TerrainControl from '$routes/components/map_control/TerrainControl.svelte';
	import ZoomControl from '$routes/components/map_control/ZoomControl.svelte';
	import { isStreetView } from '$routes/store';
	import StreetViewControl from '$routes/components/map_control/StreetViewControl.svelte';
</script>

<div class="absolute right-0 top-0 z-10 flex flex-col gap-2 p-2">
	<ZoomControl />
	<TerrainControl />
	<GeolocateControl />
	<StreetViewControl />
</div>

<ScaleControl />

<style>
</style>
