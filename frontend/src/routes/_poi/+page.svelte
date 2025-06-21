<script lang="ts">
	import maplibregl, { MapMouseEvent, type LngLatLike } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { FeatureCollection } from 'geojson';
	import turfHexGrid from '@turf/hex-grid';
	import turfBbox from '@turf/bbox';

	let map: maplibregl.Map | null = null;
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	// コンポーネントがマウントされたときにマップを初期化
	onMount(async () => {
		if (!mapContainer) {
			console.error('Map container is not defined');
			return;
		}

		const geojson = (await fetch('./merge_poi.geojson').then((res) =>
			res.json()
		)) as FeatureCollection;

		// (styleJson.layers = styleJson.layers.filter((layer) => layer['source-layer'] === 'Cntr')), // 背景レイヤーを除外
		// 	console.log('Filtered styleJson:', styleJson);
		// MapLibreマップの初期化
		map = new maplibregl.Map({
			container: mapContainer,
			style: {
				version: 8,
				glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
				sources: {
					pales: {
						// ソースの定義
						type: 'raster', // データタイプはラスターを指定
						tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'], // タイルのURL
						tileSize: 256, // タイルのサイズ
						maxzoom: 18, // 最大ズームレベル
						attribution: "<a href='https://www.gsi.go.jp/' target='_blank'>国土地理院</a>" // 地図上に表示される属性テキスト
					},
					poi: {
						type: 'geojson', // データタイプはGeoJSONを指定
						data: geojson // GeoJSONデータを直接指定
					}
				},
				layers: [
					{
						id: 'pales_layer', // レイヤーのID
						source: 'pales', // ソースのID
						type: 'raster' // データタイプはラスターを指定
					},
					{
						id: 'poi_layer', // レイヤーのID
						source: 'poi', // ソースのID
						type: 'circle',
						paint: {
							'circle-color': '#ff0000', // 円の色
							'circle-radius': 5, // 円の半径
							'circle-opacity': 0.8 // 円の不透明度
						}
					}
					// {
					// 	id: 'poi_layer', // レイヤーのID
					// 	source: 'poi', // ソースのID
					// 	type: 'symbol', // データタイプはサークルを指定
					// 	paint: {
					// 		'text-color': '#000', // テキストの色
					// 		'text-halo-color': '#fff', // テキストのハロー色
					// 		'text-halo-width': 1 // ハローの幅
					// 	},
					// 	layout: {
					// 		'icon-image': 'poi-icon', // アイコンの画像名
					// 		'icon-size': 1.5, // アイコンのサイズ
					// 		'text-field': 'AA', // テキストフィールド
					// 		'text-size': 12, // テキストサイズ
					// 		'text-anchor': 'center', // テキストのアンカー位置
					// 		'text-offset': [0, 0.5] // テキストのオフセット
					// 	}
					// }
				]
			},
			center: [136.926011, 35.551299] as LngLatLike, // 初期表示の中心座標
			zoom: 15.36, // 初期ズームレベル
			hash: true // URLハッシュを使用してマップの状態を管理
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

		// グリッドベースのより実用的な実装
		function optimizedGridThinning(points, zoomLevel) {
			const cellSize = calculateCellSize(zoomLevel);
			const bbox = turfBbox(points);

			// より細かいヘックスグリッドを使用
			const hexGrid = turfHexGrid(bbox, cellSize, { units: 'kilometers' });
			const collected = turf.collect(hexGrid, points, 'properties', 'points');

			return turf.featureCollection(
				collected.features
					.filter((hex) => hex.properties.points && hex.properties.points.length > 0)
					.map((hex) => selectBestPoint(hex.properties.points))
			);
		}

		function calculateCellSize(zoom) {
			// ズームレベルに応じた動的なセルサイズ
			const baseSize = 10; // km
			return baseSize / Math.pow(2, Math.max(0, zoom - 8));
		}

		map.on('moveend', () => {
			// マップがロードされた後に実行される処理
			console.log('Map has loaded successfully');
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
