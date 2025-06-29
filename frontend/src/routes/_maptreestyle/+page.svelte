<script lang="ts">
	import maplibregl, { MapMouseEvent, type LngLatLike } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { FeatureCollection } from 'geojson';
	import { style } from './style';

	let map: maplibregl.Map | null = null;
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	// コンポーネントがマウントされたときにマップを初期化
	onMount(async () => {
		if (!mapContainer) {
			console.error('Map container is not defined');
			return;
		}

		// (styleJson.layers = styleJson.layers.filter((layer) => layer['source-layer'] === 'Cntr')), // 背景レイヤーを除外
		// 	console.log('Filtered styleJson:', styleJson);
		// MapLibreマップの初期化
		// map = new maplibregl.Map({
		// 	container: mapContainer,
		// 	style: styleJson, // スタイルJSONを適用
		// 	center: [134.35, 34.67] as LngLatLike, // 初期表示の中心座標
		// 	zoom: 9 // 初期ズームレベル
		// });

		const map = new maplibregl.Map({
			hash: true, // URLのハッシュを使用してマップの状態を管理
			container: mapContainer,
			style: {
				projection: {
					type: 'globe'
				},
				version: 8,
				metadata: {
					'mapbox:autocomposite': false,
					'mapbox:type': 'template',
					'maputnik:renderer': 'mbgljs',
					'openmaptiles:version': '3.x',
					'openmaptiles:mapbox:owner': 'openmaptiles',
					'openmaptiles:mapbox:source:url': 'mapbox://openmaptiles.4qljc88t'
				},

				sprite: 'https://tile.openstreetmap.jp/styles/maptiler-basic-ja/sprite',
				glyphs: 'https://tile.openstreetmap.jp/fonts/{fontstack}/{range}.pbf',
				sources: {
					...style.sources, // スタイルのソースを適用
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
					},
					tree_species: {
						type: 'vector',
						tiles: [
							'https://rinya-tochigi.geospatial.jp/2023/rinya/tile/tree_species/{z}/{x}/{y}.pbf'
						],
						maxzoom: 18,
						minzoom: 8,
						attribution: '栃木県森林資源データ',
						bounds: [139.326731, 36.199924, 140.291983, 37.155039]
					}
				},
				layers: [
					...style.layers, // スタイルのレイヤーを適用

					{
						id: 'tree_species_tochigi',
						source: 'tree_species',
						maxzoom: 24,
						minzoom: 0,
						metadata: {
							name: '栃木県 樹種ポリゴン',
							location: '栃木県',
							titles: [
								{
									conditions: ['樹種'],
									template: '{樹種}'
								},
								{
									conditions: [],
									template: '栃木県の樹種ポリゴン'
								}
							]
						},
						'source-layer': 'tree_species_tochigi',
						type: 'fill',
						paint: {
							'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.8, 0.5],
							'fill-outline-color': '#00000000',
							'fill-color': [
								'case',
								['boolean', ['feature-state', 'selected'], false],
								'#00d4fe',
								[
									'match',
									['get', '解析樹種ID'],
									'01',
									'#00cc66',
									'02',
									'#99ff66',
									'03',
									'#cc0000',
									'04',
									'#ff9966',
									'05',
									'#ffcc99',
									'06',
									'#cc6600',
									'07',
									'#cc00cc',
									'08',
									'#ffff99',
									'09',
									'#ff9933',
									'10',
									'#cc9900',
									'11',
									'#ffff00',
									'12',
									'#8000ff',
									'96',
									'#8db3e2',
									'97',
									'#ccff99',
									'98',
									'#ff80ff',
									'99',
									'#bfbfbf',
									'#00000000'
								]
							]
						},
						layout: {}
					},
					{
						id: 'tree_species_tochigi_label',
						source: 'tree_species',
						'source-layer': 'tree_species_tochigi',
						type: 'symbol',
						layout: {
							'text-field': ['get', '樹種'],
							'text-size': 12,
							'text-anchor': 'left',
							'text-offset': [1.5, 0],
							'icon-image': 'tree-icon', // アイコンを設定
							'icon-size': 0.5
						},
						paint: {
							'text-color': '#000000',
							'icon-color': '#228B22' // 森林緑
						}
					}
					// {
					// 	id: '行政区画',
					// 	type: 'fill',
					// 	source: 'v',
					// 	'source-layer': 'AdmArea',
					// 	paint: {
					// 		'fill-color': 'rgba(255,255,255,0.6)'
					// 	}
					// },

					// {
					// 	id: 'place',
					// 	type: 'symbol',
					// 	source: 'openmaptiles',
					// 	'source-layer': 'place',
					// 	filter: ['all', ['==', 'class', 'country']],
					// 	layout: {
					// 		'text-field': ['get', 'name:ja'],

					// 		'text-size': 12,
					// 		'text-anchor': 'center'
					// 	},
					// 	paint: {
					// 		'text-color': '#000000',
					// 		'text-halo-color': '#ffffff',
					// 		'text-halo-width': 1
					// 	}
					// }
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

		map.on('styleimagemissing', async (e) => {
			console.log('Style image missing:', e.id);
			if (e.id === 'tree-icon') {
				await map
					.loadImage('./icon/tree164.png')
					.then((image) => {
						console.log('Tree icon loaded:', image);
						map.addImage('tree-icon', image.data, {
							sdf: true // SDF (Signed Distance Field) 形式でアイコンを追加
						});
						console.log('Tree icon added to map');
					})
					.catch((error) => {
						console.error('Error loading tree icon:', error);
					});
			}
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
