<script lang="ts">
	import GeolocateControl from '$routes/components/mapControl/GeolocateControl.svelte';
	import ScaleControl from '$routes/components/mapControl/ScaleControl.svelte';
	import TerrainControl from '$routes/components/mapControl/TerrainControl.svelte';
	import ZoomControl from '$routes/components/mapControl/ZoomControl.svelte';
</script>

<div class="absolute right-0 top-0 z-10 flex flex-col gap-2 p-2">
	<ZoomControl />
	<TerrainControl />
	<GeolocateControl />
</div>

<ScaleControl />

<style>
</style>
