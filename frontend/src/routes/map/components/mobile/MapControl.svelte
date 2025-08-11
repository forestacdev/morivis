<script lang="ts">
	import Icon from '@iconify/svelte';
	import Compass from '$routes/map/components/map_control/Compass.svelte';
	import GeolocateControl from '$routes/map/components/map_control/GeolocateControl.svelte';
	import StreetViewControl from '$routes/map/components/map_control/StreetViewControl.svelte';
</script>

<div class="flex flex-col gap-3">
	<div class="bg-main rounded-full">
		<StreetViewControl />
		<GeolocateControl />
	</div>
	<Compass />
</div>

<style>
</style>
