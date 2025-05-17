<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl, { MapMouseEvent, type LngLatLike } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import {
		TerraDraw,
		TerraDrawAngledRectangleMode,
		TerraDrawCircleMode,
		TerraDrawFreehandMode,
		TerraDrawLineStringMode,
		TerraDrawPointMode,
		TerraDrawPolygonMode,
		TerraDrawRectangleMode,
		TerraDrawRenderMode,
		TerraDrawSectorMode,
		TerraDrawSelectMode,
		TerraDrawSensorMode
	} from 'terra-draw';
	import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';

	let map: maplibregl.Map | null = null;
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	// コンポーネントがマウントされたときにマップを初期化
	onMount(() => {
		if (!mapContainer) {
			console.error('Map container is not defined');
			return;
		}

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
					}
				},
				layers: [
					{
						id: 'pales_layer',
						source: 'pales',
						type: 'raster'
					}
				]
			},
			center: [139.7454, 35.6586],
			zoom: 9 // 初期ズームレベル
		});

		const adapter = new TerraDrawMapLibreGLAdapter({
			// Pass in the map instance
			map
		});

		map?.once('style.load', () => {
			const draw = new TerraDraw({
				adapter: adapter,
				modes: [
					new TerraDrawSelectMode({
						moduleName: 'select'
					}),
					new TerraDrawPointMode({
						modeName: 'point'
					}),
					new TerraDrawLineStringMode({
						modeName: 'line'
					}),
					new TerraDrawPolygonMode({
						modeName: 'polygon'
					}),
					new TerraDrawCircleMode({
						modeName: 'circle' // 円
					}),
					new TerraDrawSectorMode({
						modeName: 'sector' // 円弧
					}),
					new TerraDrawSensorMode({
						modeName: 'sensor' // センサー
					}),
					new TerraDrawRectangleMode({
						modeName: 'rectangle' // 矩形
					}),
					new TerraDrawAngledRectangleMode({
						modeName: 'angled-rectangle' // 角度付き矩形
					}),
					new TerraDrawFreehandMode({
						modeName: 'freehand' // 自由描画
					}),

					new TerraDrawRenderMode({
						modeName: 'hand' // 手動描画
					})
				]
			});

			draw.start();
			draw.setMode('hand');
		});
	});
</script>

<div bind:this={mapContainer} class="w-hull h-full"></div>
