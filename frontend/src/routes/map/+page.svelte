<script lang="ts">
	// import Header from '$routes/map/components/_Header.svelte';
	import InfoDialog from '$map/components/dialog/InfoDialog.svelte';
	import TermsOfServiceDialog from '$map/components/dialog/TermsOfServiceDialog.svelte';
	import Map from '$map/components/Map.svelte';
	import SideMenu from '$map/components/sideMenu/_Index.svelte';
</script>

<div class="bg-base relative flex h-full w-full flex-grow">
	<Map />
</div>
<SideMenu />
<InfoDialog />
<TermsOfServiceDialog />

<style>
</style>
