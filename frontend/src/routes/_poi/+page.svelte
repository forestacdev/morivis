<script lang="ts">
	import maplibregl, { MapMouseEvent, type LngLatLike } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { FeatureCollection } from 'geojson';

	import { optimizedGridThinning } from './utils';

	let map: maplibregl.Map | null = null;
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ
	let currentZoom = $state<number>(0); // 現在のズームレベル

	let geojson: FeatureCollection;
	let markerManager; // 追加

	// 空間ハッシュによる衝突判定マネージャー
	class SpatialHashCollisionManager {
		constructor(cellSize = 100) {
			this.cellSize = cellSize;
			this.grid = new Map();
			this.markers = new Map();
		}

		getGridKeys(bounds) {
			const keys = [];
			const startX = Math.floor(bounds.x / this.cellSize);
			const endX = Math.floor((bounds.x + bounds.width) / this.cellSize);
			const startY = Math.floor(bounds.y / this.cellSize);
			const endY = Math.floor((bounds.y + bounds.height) / this.cellSize);

			for (let x = startX; x <= endX; x++) {
				for (let y = startY; y <= endY; y++) {
					keys.push(`${x},${y}`);
				}
			}
			return keys;
		}

		addMarker(id, element, priority = 0) {
			const rect = element.getBoundingClientRect();
			const bounds = {
				x: rect.left,
				y: rect.top,
				width: rect.width,
				height: rect.height
			};

			this.markers.set(id, {
				element: element,
				bounds: bounds,
				priority: priority,
				visible: true
			});
		}

		updateCollisions() {
			// グリッドをクリア
			this.grid.clear();

			// 現在の位置でマーカーを更新
			this.markers.forEach((marker, id) => {
				const rect = marker.element.getBoundingClientRect();
				marker.bounds = {
					x: rect.left,
					y: rect.top,
					width: rect.width,
					height: rect.height
				};
			});

			// 優先度順にソート
			const sortedMarkers = Array.from(this.markers.entries()).sort(
				([idA, markerA], [idB, markerB]) => markerA.priority - markerB.priority
			);

			const processed = new Set();

			sortedMarkers.forEach(([id, marker]) => {
				if (processed.has(id)) return;

				const keys = this.getGridKeys(marker.bounds);
				let hasCollision = false;

				// 衝突チェック
				keys.forEach((key) => {
					if (this.grid.has(key)) {
						this.grid.get(key).forEach((existingId) => {
							const existingMarker = this.markers.get(existingId);
							if (this.checkBoundsOverlap(marker.bounds, existingMarker.bounds)) {
								hasCollision = true;
							}
						});
					}
				});

				if (!hasCollision) {
					// 衝突なし - 表示してグリッドに追加
					marker.element.style.display = 'block';
					marker.visible = true;

					keys.forEach((key) => {
						if (!this.grid.has(key)) {
							this.grid.set(key, new Set());
						}
						this.grid.get(key).add(id);
					});
				} else {
					// 衝突あり - 非表示
					marker.element.style.display = 'none';
					marker.visible = false;
				}

				processed.add(id);
			});
		}

		checkBoundsOverlap(a, b) {
			return !(
				a.x + a.width < b.x ||
				b.x + b.width < a.x ||
				a.y + a.height < b.y ||
				b.y + b.height < a.y
			);
		}

		removeMarker(id) {
			this.markers.delete(id);
		}

		clear() {
			this.grid.clear();
			this.markers.clear();
		}
	}

	// MapLibre用マーカーマネージャー
	class MapMarkerManager {
		constructor(mapInstance) {
			this.map = mapInstance;
			this.collisionManager = new SpatialHashCollisionManager(80); // 80pxグリッド
			this.markers = new Map();
			this.debounceTimer = null;
			this.isProcessing = false;

			// マップイベントリスナーを設定
			this.setupEventListeners();
		}

		setupEventListeners() {
			// マップの移動・ズーム終了時に衝突判定を実行
			this.map.on('moveend', () => this.onMapChange());
			this.map.on('zoomend', () => this.onMapChange());
			this.map.on('resize', () => this.onMapChange());
		}

		// マーカーを追加（DOM要素として）
		addDOMMarker(id, lngLat, content, priority = 0, className = 'custom-marker') {
			// DOM要素を作成
			const markerElement = document.createElement('div');
			markerElement.className = className;
			markerElement.innerHTML = content;
			markerElement.style.position = 'absolute';
			markerElement.style.zIndex = 1000 - priority; // 優先度が高いほど前面に

			// MapLibre Markerを作成
			const maplibreMarker = new maplibregl.Marker({
				element: markerElement,
				anchor: 'bottom'
			})
				.setLngLat(lngLat)
				.addTo(this.map);

			// 内部管理用に保存
			this.markers.set(id, {
				maplibreMarker: maplibreMarker,
				element: markerElement,
				lngLat: lngLat,
				priority: priority,
				content: content
			});

			// 衝突管理に追加
			this.collisionManager.addMarker(id, markerElement, priority);

			return maplibreMarker;
		}

		// ポップアップ付きマーカーを追加
		addPopupMarker(id, lngLat, markerContent, popupContent, priority = 0) {
			const markerElement = document.createElement('div');
			markerElement.className = 'popup-marker';
			markerElement.innerHTML = markerContent;
			markerElement.style.cursor = 'pointer';

			// ポップアップを作成
			const popup = new maplibregl.Popup({
				offset: 25,
				closeButton: false,
				closeOnClick: false
			}).setHTML(popupContent);

			const maplibreMarker = new maplibregl.Marker({
				element: markerElement,
				anchor: 'bottom'
			})
				.setLngLat(lngLat)
				.setPopup(popup)
				.addTo(this.map);

			// マーカークリックでポップアップ表示
			markerElement.addEventListener('click', () => {
				popup.addTo(this.map);
			});

			this.markers.set(id, {
				maplibreMarker: maplibreMarker,
				element: markerElement,
				popup: popup,
				lngLat: lngLat,
				priority: priority
			});

			this.collisionManager.addMarker(id, markerElement, priority);

			return maplibreMarker;
		}

		// GeoJSONデータから一括でマーカーを作成
		addMarkersFromGeoJSON(geojson, options = {}) {
			const {
				getContent = (feature) => `<div class="marker-pin"></div>`,
				getPriority = (feature) => feature.properties.priority || 0,
				getPopupContent = null,
				markerClass = 'geojson-marker'
			} = options;

			geojson.features.forEach((feature, index) => {
				if (feature.geometry.type === 'Point') {
					const id = feature.properties.id || `marker-${index}`;
					const lngLat = feature.geometry.coordinates;
					const content = getContent(feature);
					const priority = getPriority(feature);

					if (getPopupContent) {
						const popupContent = getPopupContent(feature);
						this.addPopupMarker(id, lngLat, content, popupContent, priority);
					} else {
						this.addDOMMarker(id, lngLat, content, priority, markerClass);
					}
				}
			});

			// 初回衝突判定
			this.updateMarkerVisibility();
		}

		// マーカーを削除
		removeMarker(id) {
			const marker = this.markers.get(id);
			if (marker) {
				marker.maplibreMarker.remove();
				this.markers.delete(id);
				this.collisionManager.removeMarker(id);
			}
		}

		// 全マーカーをクリア
		clearAllMarkers() {
			this.markers.forEach((marker, id) => {
				marker.maplibreMarker.remove();
			});
			this.markers.clear();
			this.collisionManager.clear();
		}

		// マップ変更時の処理
		onMapChange() {
			if (this.isProcessing) return;

			// デバウンス処理
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer);
			}

			this.debounceTimer = setTimeout(() => {
				this.updateMarkerVisibility();
			}, 150); // 150ms後に実行
		}

		// マーカー表示状態を更新
		updateMarkerVisibility() {
			if (this.isProcessing) return;

			this.isProcessing = true;

			try {
				// 画面外のマーカーを事前に非表示
				this.hideOffscreenMarkers();

				// 衝突判定を実行
				this.collisionManager.updateCollisions();
			} catch (error) {
				console.error('Error updating marker visibility:', error);
			} finally {
				this.isProcessing = false;
			}
		}

		// 画面外マーカーの非表示処理
		hideOffscreenMarkers() {
			const bounds = this.map.getBounds();

			this.markers.forEach((marker, id) => {
				const [lng, lat] = marker.lngLat;
				const isVisible = bounds.contains([lng, lat]);

				if (!isVisible) {
					marker.element.style.display = 'none';
				} else {
					marker.element.style.display = 'block';
				}
			});
		}

		// 優先度を更新
		updateMarkerPriority(id, newPriority) {
			const marker = this.markers.get(id);
			if (marker) {
				marker.priority = newPriority;
				marker.element.style.zIndex = 1000 - newPriority;
				this.collisionManager.markers.get(id).priority = newPriority;
				this.updateMarkerVisibility();
			}
		}

		// 統計情報を取得
		getStats() {
			const totalMarkers = this.markers.size;
			const visibleMarkers = Array.from(this.markers.values()).filter(
				(marker) => marker.element.style.display !== 'none'
			).length;

			return {
				total: totalMarkers,
				visible: visibleMarkers,
				hidden: totalMarkers - visibleMarkers,
				hiddenPercentage: (((totalMarkers - visibleMarkers) / totalMarkers) * 100).toFixed(1)
			};
		}
	}

	// コンポーネントがマウントされたときにマップを初期化
	onMount(async () => {
		if (!mapContainer) {
			console.error('Map container is not defined');
			return;
		}

		geojson = (await fetch('./merge_poi.geojson').then((res) => res.json())) as FeatureCollection;

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
						type: 'symbol', // データタイプはサークルを指定
						paint: {
							'text-color': '#000', // テキストの色
							'text-halo-color': '#fff', // テキストのハロー色
							'text-halo-width': 1 // ハローの幅
						},
						layout: {
							'icon-image': 'poi-icon', // アイコンの画像名
							'icon-size': 1.5, // アイコンのサイズ
							'text-field': 'AA', // テキストフィールド
							'text-size': 12, // テキストサイズ
							'text-anchor': 'center', // テキストのアンカー位置
							'text-offset': [0, 0.5] // テキストのオフセット
						}
					}
				]
			},
			center: [136.926011, 35.551299] as LngLatLike, // 初期表示の中心座標
			zoom: 15.36, // 初期ズームレベル
			hash: true // URLハッシュを使用してマップの状態を管理
		});

		// extract the color from the id
		const rgb = [255, 0, 0]; // 赤色のRGB値

		const width = 32; // The image will be 64 pixels square
		const bytesPerPixel = 4; // Each pixel is represented by 4 bytes: red, green, blue, and alpha.
		const data = new Uint8Array(width * width * bytesPerPixel);

		for (let x = 0; x < width; x++) {
			for (let y = 0; y < width; y++) {
				const offset = (y * width + x) * bytesPerPixel;
				data[offset + 0] = rgb[0]; // red
				data[offset + 1] = rgb[1]; // green
				data[offset + 2] = rgb[2]; // blue
				data[offset + 3] = 255; // alpha
			}
		}

		map.addImage('poi-icon', { width, height: width, data });

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

		const markers = {};
		let markersOnScreen = {};

		function updateMarkers() {
			const newMarkers = {};
			const features = map.queryRenderedFeatures({ layers: ['poi_layer'] });

			// 現在表示されているフィーチャーのIDを収集
			const visibleIds = new Set();

			// for every feature on the screen, create an HTML marker for it (if we didn't yet),
			// and add it to the map if it's not there already
			for (let i = 0; i < features.length; i++) {
				const coords = features[i].geometry.coordinates;
				const props = features[i].properties;

				const id = props._prop_id;
				visibleIds.add(id); // 表示されているIDを記録

				let marker = markers[id];

				if (!marker && id) {
					marker = new maplibregl.Marker({}).setLngLat(coords);

					markers[id] = marker; // markersオブジェクトにも保存
				}

				if (marker) {
					newMarkers[id] = marker;
					if (!markersOnScreen[id]) {
						marker.addTo(map);
					}
				}
			}

			// 表示されていないマーカーを削除
			for (const id in markersOnScreen) {
				if (!visibleIds.has(id)) {
					markersOnScreen[id].remove();
					// markersオブジェクトからも削除（メモリリークを防ぐ）
					delete markers[id];
				}
			}

			markersOnScreen = newMarkers;
		}

		map.on('move', updateMarkers);

		map.on('load', async () => {
			// マーカーマネージャーを初期化
			// markerManager = new MapMarkerManager(map);
			// try {
			// 	// GeoJSONデータを読み込み
			// 	// 既存の間引き処理の代わりにマーカーマネージャーを使用
			// 	markerManager.addMarkersFromGeoJSON(geojson, {
			// 		getContent: (feature) => {
			// 			// マーカーの見た目をカスタマイズ
			// 			const name = feature.properties.name || 'POI';
			// 			return `<div class="poi-marker">
			// 			<div class="marker-pin"></div>
			// 			<div class="marker-label">${name}</div>
			// 		</div>`;
			// 		},
			// 		getPriority: (feature) => {
			// 			// 優先度ロジック（数値が小さいほど高優先度）
			// 			if (feature.properties.category === 'station') return 0;
			// 			if (feature.properties.category === 'landmark') return 1;
			// 			return feature.properties.priority || 5;
			// 		},
			// 		getPopupContent: (feature) => {
			// 			// ポップアップ内容
			// 			return `
			// 			<h3>${feature.properties.name || 'POI'}</h3>
			// 			<p>${feature.properties.description || ''}</p>
			// 			<small>カテゴリ: ${feature.properties.category || 'その他'}</small>
			// 		`;
			// 		},
			// 		markerClass: 'custom-poi-marker'
			// 	});
			// 	// 統計情報を表示
			// 	console.log('マーカー統計:', markerManager.getStats());
			// } catch (error) {
			// 	console.error('GeoJSONの読み込みに失敗:', error);
			// }
		});
	});

	// map.on('moveend', () => {
	// 	// マップがロードされた後に実行される処理
	// 	const data = optimizedGridThinning(geojson, map?.getZoom(), map);

	// 	const source = map?.getSource('poi') as maplibregl.GeoJSONSource;
	// 	if (source) {
	// 		source.setData(data);
	// 	} else {
	// 		console.error('Source "poi" not found');
	// 	}
	// });

	// map.on('zoom', () => {
	// 	currentZoom = Math.floor(map?.getZoom() || 0); // 小数点以下切り捨て
	// });

	// $effect(() => {
	// 	if (currentZoom) {
	// 		const data = optimizedGridThinning(geojson, map?.getZoom(), map);
	// 		const source = map?.getSource('poi') as maplibregl.GeoJSONSource;
	// 		if (source) {
	// 			source.setData(data);
	// 		} else {
	// 			console.error('Source "hex" not found');
	// 		}
	// 	}
	// });

	// // 例として東京タワーの地理座標
	// const tokyoTowerLngLat = [139.7454, 35.6586]; // [経度, 緯度]

	// // 地理座標を画面のピクセル座標に変換
	// const screenPoint = map.project(tokyoTowerLngLat);

	// console.log(`東京タワーの地理座標: ${tokyoTowerLngLat}`);
	// console.log(`東京タワーの画面ピクセル座標: x=${screenPoint.x}, y=${screenPoint.y}`);
</script>

<div bind:this={mapContainer} class="w-hull h-full"></div>

<style>
	/* マーカー用のCSS */
</style>
