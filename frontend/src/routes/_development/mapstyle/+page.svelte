<script lang="ts">
	import maplibregl, { MapMouseEvent, type LngLatLike } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { FeatureCollection } from 'geojson';
	import styleJson from './std.json';

	let map: maplibregl.Map | null = null;
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	// コンポーネントがマウントされたときにマップを初期化
	onMount(async () => {
		if (!mapContainer) {
			console.error('Map container is not defined');
			return;
		}

		// (styleJson.layers = styleJson.layers.filter(
		// 	(layer) => layer['source-layer'] === 'RailCL' && layer.type === 'line'
		// )),
		// 	console.log('Filtered styleJson:', styleJson);

		map = new maplibregl.Map({
			container: mapContainer,
			style: {
				projection: {
					type: 'globe'
				},
				version: 8,
				glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
				sources: {
					base: {
						type: 'raster',
						tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'], // タイルのURL
						tileSize: 256,

						attribution: ''
					},
					v: {
						type: 'vector',
						minzoom: 4,
						maxzoom: 16,
						tiles: ['https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/{z}/{x}/{y}.pbf'],
						attribution: '国土地理院最適化ベクトルタイル(標準地図風スタイル)'
					},

					openmaptiles: {
						type: 'vector',
						tiles: ['https://tile.openstreetmap.jp/data/planet/{z}/{x}/{y}.pbf'],
						attribution:
							'© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
						maxzoom: 14
					}
				},
				layers: [
					{
						id: 'base',
						source: 'base',
						type: 'raster'
					},
					{
						id: '行政区画',
						type: 'fill',
						source: 'v',
						'source-layer': 'AdmArea',
						paint: {
							'fill-color': 'rgba(255,255,255,0.6)'
						}
					},

					{
						id: 'place',
						type: 'symbol',
						source: 'openmaptiles',
						'source-layer': 'place',
						filter: ['all', ['==', 'class', 'country']],
						layout: {
							'text-field': ['get', 'name:ja'],

							'text-size': 12,
							'text-anchor': 'center'
						},
						paint: {
							'text-color': '#000000',
							'text-halo-color': '#ffffff',
							'text-halo-width': 1
						}
					}
					// {
					//     id: 'background',
					//     type: 'background',
					//     paint: {
					//         'background-color': '#fff266', // 背景色を黒に設定
					//         'background-opacity': 0.3, // 背景の不透明度を1に設定
					//     },
					// },
				]
			},

			center: [134.35, 34.67] as LngLatLike, // 初期表示の中心座標
			zoom: 9 // 初期ズームレベル
		});

		map.on('click', (event: MapMouseEvent) => {
			const features = map?.queryRenderedFeatures(event.point);
			if (features && features.length > 0) {
				console.log('Features at clicked point:', features);
				const feature = features[0];
				console.log('Clicked feature:', feature);
			} else {
				console.log('No features found at this point.');
			}
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
