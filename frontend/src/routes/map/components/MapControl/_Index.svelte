<script lang="ts">
	import GeolocateControl from '$routes/map/components/mapControl/GeolocateControl.svelte';
	import ScaleControl from '$routes/map/components/mapControl/ScaleControl.svelte';
	import TerrainControl from '$routes/map/components/mapControl/TerrainControl.svelte';
	import ZoomControl from '$routes/map/components/mapControl/ZoomControl.svelte';
</script>

<ZoomControl />
<TerrainControl />
<GeolocateControl />
<ScaleControl />

<style>
</style>
