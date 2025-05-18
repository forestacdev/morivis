<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl, { MapMouseEvent, type LngLatLike } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { getBoundingBoxCorners } from '$routes/utils/map';
	import { ENTRY_TIFF_DATA_PATH } from '$routes/constants';

	import { loadRasterData } from './index';

	let map: maplibregl.Map | null = null;
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	// コンポーネントがマウントされたときにマップを初期化
	onMount(async () => {
		if (!mapContainer) {
			console.error('Map container is not defined');
			return;
		}

		const image = await loadRasterData(`${ENTRY_TIFF_DATA_PATH}/4326_test.tif`);

		// MapLibreマップの初期化
		map = new maplibregl.Map({
			container: mapContainer,
			style: {
				version: 8,
				glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
				sources: {
					pales: {
						type: 'raster',
						tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
						tileSize: 256,
						maxzoom: 18,
						attribution: "<a href='https://www.gsi.go.jp/' target='_blank'>国土地理院</a>"
					},
					tiff: {
						type: 'image',
						url: image as string,
						coordinates: getBoundingBoxCorners([136.276225, 35.133729, 137.651936, 36.465031])
					}
				},
				layers: [
					{
						id: 'pales_layer',
						source: 'pales',
						type: 'raster'
					},
					{
						id: 'tiff_layer',
						source: 'tiff',
						type: 'raster',
						minzoom: 0,
						maxzoom: 22
					}
				]
			},
			center: [139.7454, 35.6586],
			zoom: 9, // 初期ズームレベル,
			hash: true
		});
	});
</script>

<div bind:this={mapContainer} class="w-hull h-full"></div>
