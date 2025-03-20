<script lang="ts">
	import GeolocateControl from '$routes/components/mapControl/GeolocateControl.svelte';
	import ScaleControl from '$routes/components/mapControl/ScaleControl.svelte';
	import TerrainControl from '$routes/components/mapControl/TerrainControl.svelte';
	import ZoomControl from '$routes/components/mapControl/ZoomControl.svelte';
</script>

<ZoomControl />
<TerrainControl />
<GeolocateControl />
<ScaleControl />

<style>
</style>
