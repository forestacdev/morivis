<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as pmtiles from 'pmtiles';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
	let mapContainer: HTMLDivElement;
	let worker: Worker;

	const getStyleJson = async (url: string) => {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch ${url}`);
		}
		return await response.json();
	};

	onMount(async () => {
		const style = await getStyleJson('osm_liberty.json');

		style.sources['mino-dem'] = gsiTerrainSource;

		const map = new maplibregl.Map({
			container: mapContainer,
			style: style,
			center: [136.923004009, 35.5509525769706],
			zoom: 14.5,
			maxZoom: 18,
			maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
		});

		map.on('load', () => {
			// 標高タイルセット
			map.setTerrain({ source: 'mino-dem', exaggeration: 1.2 });
		});
	});
</script>

<div bind:this={mapContainer} class="h-screen w-screen"></div>
