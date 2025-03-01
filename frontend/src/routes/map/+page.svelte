<script lang="ts">
	// import Header from '$routes/map/components/_Header.svelte';
	import Map from '$map/components/Map.svelte';
	import SideMenu from '$map/components/sideMenu/_Index.svelte';
</script>

<div class="bg-base relative flex h-full w-full flex-grow">
	<Map />
</div>
<SideMenu />

<style>
</style>
