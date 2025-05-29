<script lang="ts">
	import maplibregl, { MapMouseEvent, type LngLatLike } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { parseDemXml } from '$routes/utils/file/demxml';

	let map: maplibregl.Map | null = null;
	let mapContainer = $state<HTMLDivElement | null>(null);

	// コンポーネントがマウントされたときにマップを初期化
	onMount(async () => {
		const xmlData = await fetch('/FG-GML-5336-27-99-DEM5A-20161001.xml')
			.then((response) => response.text())
			.catch((error) => {
				console.error('Error fetching XML:', error);
				return '';
			});

		if (!xmlData) return;

		const demContent = await parseDemXml(xmlData);
		console.log(demContent);

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
			center: [136, 35], // 初期表示の中心座標
			zoom: 9 // 初期ズームレベル
		});
	});

	// // 例として東京タワーの地理座標
	// const tokyoTowerLngLat = [139.7454, 35.6586]; // [経度, 緯度]

	// // 地理座標を画面のピクセル座標に変換
	// const screenPoint = map.project(tokyoTowerLngLat);

	// console.log(`東京タワーの地理座標: ${tokyoTowerLngLat}`);
	// console.log(`東京タワーの画面ピクセル座標: x=${screenPoint.x}, y=${screenPoint.y}`);
</script>

<div bind:this={mapContainer} class="w-hull h-full"></div>
