<script lang="ts">
	import Icon from '@iconify/svelte';
	import Compass from '$routes/map/components/map_control/Compass.svelte';
	import GeolocateControl from '$routes/map/components/map_control/GeolocateControl.svelte';
</script>

<div class="flex flex-col gap-3">
	<div class="bg-main rounded-full">
		<GeolocateControl />
	</div>
	<Compass />
</div>

<style>
</style>
