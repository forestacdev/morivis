<script lang="ts">
	import GeolocateControl from '$map/components/mapControl/GeolocateControl.svelte';
	import ScaleControl from '$map/components/mapControl/ScaleControl.svelte';
	import TerrainControl from '$map/components/mapControl/TerrainControl.svelte';
	import ZoomControl from '$map/components/mapControl/ZoomControl.svelte';
</script>

<ZoomControl />
<TerrainControl />
<GeolocateControl />
<ScaleControl />

<style>
</style>
