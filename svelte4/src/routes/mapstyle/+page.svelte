<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as pmtiles from 'pmtiles';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import styleJson from '$lib/json/osm_liberty_draft.json';

	let protocol = new pmtiles.Protocol();
	maplibregl.addProtocol('pmtiles', protocol.tile);

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
	let mapContainer: HTMLDivElement;

	onMount(async () => {
		const style = styleJson;

		console.log(style);

		style.sources['terrain'] = gsiTerrainSource;

		const map = new maplibregl.Map({
			container: mapContainer,
			style: style,
			center: [136.923004009, 35.5509525769706],
			zoom: 14.5,
			maxZoom: 18,
			maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
		});

		map.on('load', () => {
			// TerrainControlの追加
			map.addControl(
				new maplibregl.TerrainControl({
					source: 'terrain', // 地形ソースを指定
					exaggeration: 1 // 高さの倍率
				}),
				'top-right' // コントロールの位置を指定
			);
		});

		map.on('click', (e) => {
			map.queryRenderedFeatures(e.point).forEach((feature) => {
				console.log(feature.layer);
			});
		});
	});
</script>

<div bind:this={mapContainer} class="h-screen w-screen"></div>
