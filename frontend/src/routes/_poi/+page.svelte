<script lang="ts">
	import maplibregl, { MapMouseEvent, type LngLatLike } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { FeatureCollection } from 'geojson';
	import turfHexGrid from '@turf/hex-grid';
	import turfBbox from '@turf/bbox';
	import turfCollect from '@turf/collect';
	import turfCentroid from '@turf/centroid';

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
					},
					hex: {
						type: 'geojson', // データタイプはGeoJSONを指定
						data: {
							type: 'FeatureCollection',
							features: []
						}
					}
				},
				layers: [
					{
						id: 'pales_layer', // レイヤーのID
						source: 'pales', // ソースのID
						type: 'raster' // データタイプはラスターを指定
					},
					{
						id: 'hex_layer', // レイヤーのID
						source: 'hex', // ソースのID
						type: 'fill', // データタイプはフィルを指定
						paint: {
							'fill-color': '#888888', // フィルの色
							'fill-opacity': 0.5 // フィルの不透明度
						}
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

		function calculateCellSize(zoom) {
			const baseSize = 10; // km
			return baseSize / Math.pow(2, Math.max(0, zoom - 8));
		}

		function selectBestPoint(pointsInCell) {
			if (!pointsInCell || pointsInCell.length === 0) {
				return null;
			}

			if (pointsInCell.length === 1) {
				return pointsInCell[0];
			}

			// 最初のポイントを返す（シンプルな選択）
			return pointsInCell[0];

			// またはランダム選択
			// return pointsInCell[Math.floor(Math.random() * pointsInCell.length)];
		}

		function optimizedGridThinning(points, zoomLevel) {
			try {
				// より厳密な入力検証
				console.log('Input validation - points:', points);

				if (!points) {
					console.error('Points is null or undefined');
					return { type: 'FeatureCollection', features: [] };
				}

				if (!points.features) {
					console.error('Points.features is null or undefined');
					return { type: 'FeatureCollection', features: [] };
				}

				if (!Array.isArray(points.features)) {
					console.error('Points.features is not an array:', typeof points.features);
					return { type: 'FeatureCollection', features: [] };
				}

				if (points.features.length === 0) {
					console.log('No points to thin');
					return points;
				}

				console.log('Input points:', points.features.length);

				const cellSize = calculateCellSize(zoomLevel);
				console.log('Cell size:', cellSize, 'km at zoom', zoomLevel);

				const bbox = map?.getBounds();
				const bboxCoords = bbox
					? [bbox.getWest(), bbox.getSouth(), bbox.getEast(), bbox.getNorth()]
					: null;
				console.log('Bounding box:', bbox);

				const hexGrid = turfHexGrid(bboxCoords, cellSize, { units: 'kilometers' });
				console.log('Hex grid cells:', hexGrid.features.length);

				const hexSource = map?.getSource('hex') as maplibregl.GeoJSONSource;
				if (hexSource) {
					hexSource.setData(hexGrid);
				} else {
					console.error('Source "hex" not found');
				}

				// より安全なポイント処理
				const pointsWithId = {
					type: 'FeatureCollection',
					features: points.features
						.map((point, index) => {
							// ポイントの構造を確認
							if (!point || !point.geometry) {
								console.warn('Invalid point at index', index, point);
								return null;
							}

							return {
								...point,
								properties: {
									...(point.properties || {}),
									_tempId: index
								}
							};
						})
						.filter((point) => point !== null) // 無効なポイントを除外
				};

				console.log('Points with ID:', pointsWithId.features.length);

				// turf.collectを実行
				const collected = turfCollect(hexGrid, pointsWithId, '_tempId', 'pointIds');
				console.log('Collected result:', collected);

				// 結果の検証
				if (!collected || !collected.features || !Array.isArray(collected.features)) {
					console.error('Invalid collected result:', collected);
					return points;
				}

				const thinnedFeatures = collected.features
					.filter((hex) => {
						// より安全なフィルタリング
						return (
							hex &&
							hex.properties &&
							hex.properties.pointIds &&
							Array.isArray(hex.properties.pointIds) &&
							hex.properties.pointIds.length > 0
						);
					})
					.map((hex) => {
						try {
							// 正しいプロパティ名を使用
							const pointIds = hex.properties.pointIds; // .id ではなく .pointIds

							console.log('Point IDs in hex:', pointIds);

							// IDから実際のポイントを取得
							const pointsInHex = pointIds
								.filter(
									(id) => typeof id === 'number' && id >= 0 && id < pointsWithId.features.length
								)
								.map((id) => pointsWithId.features[id])
								.filter((point) => point !== null && point !== undefined);

							console.log('Points in this hex:', pointsInHex.length);

							if (pointsInHex.length === 0) {
								return null;
							}

							const bestPoint = selectBestPoint(pointsInHex);

							if (!bestPoint) {
								return null;
							}

							return {
								type: 'Feature',
								geometry: bestPoint.geometry,
								properties: bestPoint.properties || {}
							};
						} catch (hexError) {
							console.error('Error processing hex:', hexError, hex);
							return null;
						}
					})
					.filter((feature) => feature !== null);

				const thinnedGeoJSON = {
					type: 'FeatureCollection',
					features: thinnedFeatures
				};

				console.log(`元のポイント数: ${points.features.length}`);
				console.log(`間引き後のポイント数: ${thinnedFeatures.length}`);

				if (points.features.length > 0) {
					console.log(
						'間引き率:',
						(1 - thinnedFeatures.length / points.features.length) * 100 + '%'
					);
				}

				return thinnedGeoJSON;
			} catch (error) {
				console.error('Error in optimizedGridThinning:', error);
				console.error('Stack trace:', error.stack);
				// エラー時は元のデータを返す
				return points || { type: 'FeatureCollection', features: [] };
			}
		}

		map.on('moveend', () => {
			// マップがロードされた後に実行される処理
			const data = optimizedGridThinning(geojson, map?.getZoom());

			const source = map?.getSource('poi') as maplibregl.GeoJSONSource;
			if (source) {
				source.setData(data);
			} else {
				console.error('Source "poi" not found');
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
