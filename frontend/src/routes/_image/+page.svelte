<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
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

		// const imageData = await loadRasterData(`${ENTRY_TIFF_DATA_PATH}/slope.tif`);
		// const imageData = await loadRasterData(`${ENTRY_TIFF_DATA_PATH}/4326_test.tif`);
		// const imageData = await loadRasterData(`${ENTRY_TIFF_DATA_PATH}/HYP_50M_SR.tif`);
		const imageData = await loadRasterData(
			`${ENTRY_TIFF_DATA_PATH}/E000.00-S90.00-E180.00-N90.00-LST.tiff`
		);
		// const imageData = await loadRasterData('./ensyurin_dem.tiff');

		const maxBbox = [-180, -85.051129, 180, 85.051129];

		console.log('imageData', imageData);

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
						url: imageData.url as string,
						coordinates: getBoundingBoxCorners([-180, -85.051129, 180, 85.051129])
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
						paint: {
							'raster-opacity': 0.5
						},
						minzoom: 0,
						maxzoom: 22
					}
				]
			},
			center: [139.7454, 35.6586],
			zoom: 9, // 初期ズームレベル,
			hash: true,
			renderWorldCopies: false
		});

		map.fitBounds(
			[
				[imageData.bbox[0], imageData.bbox[1]], // SW
				[imageData.bbox[2], imageData.bbox[3]] // NE
			],
			{
				padding: { top: 10, right: 10, bottom: 10, left: 10 },
				maxZoom: 18,
				duration: 0
			}
		);
	});
</script>

<div bind:this={mapContainer} class="w-hull h-full"></div>
