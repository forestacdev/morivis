<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as pmtiles from 'pmtiles';

	let mapContainer: HTMLDivElement;
	let worker: Worker;

	onMount(() => {
		const protocol = new pmtiles.Protocol();
		maplibregl.addProtocol('pmtiles', protocol.tile);

		const map = new maplibregl.Map({
			container: mapContainer,
			style: 'osm_liberty.json',
			center: [136.923004009, 35.5509525769706],
			zoom: 14.5,
			maxZoom: 18,
			maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
		});
	});
</script>

<div bind:this={mapContainer} class="h-screen w-screen"></div>
