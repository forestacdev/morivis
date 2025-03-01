<script lang="ts">
	// import Header from '$routes/map/components/_Header.svelte';
	import DataMenu from '$map/components/dataMenu/_Index.svelte';
	import InfoDialog from '$map/components/dialog/InfoDialog.svelte';
	import TermsOfServiceDialog from '$map/components/dialog/TermsOfServiceDialog.svelte';
	import FooterMenu from '$map/components/footer/_Index.svelte.svelte';
	import LayerMenu from '$map/components/layerMenu/_Index.svelte';
	import Map from '$map/components/Map.svelte';
	import SideMenu from '$map/components/sideMenu/_Index.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import DebugControl from '$map/debug/_Index.svelte';

	let tempLayerEntries = $state<GeoDataEntry[]>([]); // 一時レイヤーデータ
	let layerEntries = $state<GeoDataEntry[]>([]); // レイヤーデータ
</script>

<div class="bg-base relative flex h-full w-full flex-grow">
	<LayerMenu bind:layerEntries bind:tempLayerEntries />
	<Map bind:layerEntries bind:tempLayerEntries />
	<FooterMenu {layerEntries} />
	<DataMenu />
</div>
<SideMenu />
<InfoDialog />
<TermsOfServiceDialog />

<DebugControl />

<style>
</style>
