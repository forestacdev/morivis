<script lang="ts">
	import GeolocateControl from '$routes/map/components/MapControl/GeolocateControl.svelte';
	import ScaleControl from '$routes/map/components/MapControl/ScaleControl.svelte';
	import TerrainControl from '$routes/map/components/MapControl/TerrainControl.svelte';
	import ZoomControl from '$routes/map/components/MapControl/ZoomControl.svelte';
</script>

<ZoomControl />
<TerrainControl />
<GeolocateControl />
<ScaleControl />

<style>
</style>
