<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl, { MapMouseEvent, type LngLatLike } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	interface PointGeoJSON {
		type: 'Point';
		coordinates: [number, number];
	}
	interface Feature {
		type: 'Feature';
		geometry: PointGeoJSON;
		properties: {
			type: string;
		};
	}
	interface FeatureCollection {
		type: 'FeatureCollection';
		features: Feature[];
	}

	interface PointData {
		contents: [number, number];
		triangle: [number, number];
	}

	let pointData = $state<PointData>({
		contents: [139.477, 35.681],
		triangle: [139.7454, 35.6586]
	});

	let map: maplibregl.Map | null = null;
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	let moveEl = $state<HTMLDivElement | null>(null); // ドラッグ中の要素

	// ドラッグ中に動的に追加/削除するイベントリスナーへの参照を保持する変数
	// これらが null でなければ、現在ドラッグ中であることを示す
	let activeMouseMoveListener: ((e: MapMouseEvent) => void) | null = null;
	let activeMouseUpListener: (() => void) | null = null;
	let isDragging = $state<boolean>(false); // ドラッグ状態を追跡するためのフラグ

	const createGeojson = (data: PointData): FeatureCollection => {
		return {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: data.contents
					},
					properties: {
						type: 'contents'
					}
				},
				{
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: data.triangle
					},
					properties: {
						type: 'triangle'
					}
				}
			]
		};
	};

	const convertScreenToLngLat = (screenPoint: LngLatLike): [number, number] => {
		if (!map) return [0, 0];
		const lngLat = map.project(screenPoint);
		return [lngLat.x, lngLat.y];
	};

	// マウス移動中の処理（ドラッグ中に呼ばれる）
	// この関数自体はリスナーではなく、リスナー関数内部から呼ばれるヘルパー
	const handleMouseMove = (e: maplibregl.MapMouseEvent, type: 'triangle' | 'contents') => {
		// isDragging フラグで、実際にドラッグ中か確認
		if (!isDragging) return;

		const coords = e.lngLat;
		const screenPoint = map?.project(coords);
		if (!screenPoint || !mapContainer) return;

		console.log('Drag moved', screenPoint); // デバッグログ
		const offsetX = screenPoint.x;
		const offsetY = screenPoint.y;
		const w = moveEl?.clientWidth || 0;
		const h = moveEl?.clientHeight || 0;
		const offsetX2 = offsetX - w / 2;
		const offsetY2 = offsetY - h / 2;
		moveEl.style.transform = `translate(${offsetX2}px, ${offsetY2}px)`; // ドラッグ中の要素を移動
		moveEl.style.transition = 'none'; // アニメーションを無効化

		// ドラッグしているポイントの種類に応じて pointData を更新
		if (type === 'contents') {
			pointData.contents = [coords.lng, coords.lat];
		} else if (type === 'triangle') {
			pointData.triangle = [coords.lng, coords.lat];
		}
	};

	// マウスボタンが離されたときの処理（ドラッグ終了時に呼ばれる）
	// この関数自体が mouseup のリスナーとして登録される
	const handleMouseUp = () => {
		console.log('Drag ended'); // デバッグログ

		if (!map) return;

		// カーソルをデフォルトに戻す
		const canvas = map.getCanvasContainer();
		canvas.style.cursor = '';
		isDragging = false; // ドラッグ状態を解除

		if (activeMouseMoveListener) {
			map.off('mousemove', activeMouseMoveListener);
			activeMouseMoveListener = null; // 参照をクリア
		}
		// map.once で登録した mouseup リスナーは自動的に解除されますが、参照はクリア
		activeMouseUpListener = null;
		// --- 修正箇所 終わり ---
	};

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
			center: pointData.contents, // 初期表示の中心座標
			zoom: 9 // 初期ズームレベル
		});

		map.on('load', () => {
			if (!map) return;

			// HMRなどでソースが既に存在する場合のクリーンアップ
			if (map.getSource('point')) map.removeSource('point');

			// GeoJSONソースの追加
			map.addSource('point', {
				type: 'geojson',
				data: createGeojson(pointData) // 初期データ
			});

			// ポイント表示用のサークルレイヤーの追加
			map.addLayer({
				id: 'point', // レイヤーID
				source: 'point', // 使用するソースID
				type: 'circle',
				paint: {
					'circle-radius': 10,
					'circle-color': '#FF0000', // 赤色の円
					'circle-opacity': 0.8,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#FFFFFF'
				}
			});

			// レイヤー上にマウスが乗ったときのカーソル変更（掴めるように見せる）
			map.on('mouseenter', 'point', () => {
				if (!map) return;
				if (!isDragging) {
					// ドラッグ中でなければカーソル変更
					map.getCanvasContainer().style.cursor = 'pointer'; // または 'grab'
				}
			});
			map.on('mouseleave', 'point', () => {
				if (!map) return;
				if (!isDragging) {
					// ドラッグ中でなければカーソル変更
					map.getCanvasContainer().style.cursor = ''; // デフォルトに戻す
				}
			});
		});

		// 'point' レイヤー上でマウスボタンが押されたときの処理（ドラッグ開始）
		map.on('mousedown', 'point', (e) => {
			// デフォルトのマップドラッグ挙動を防ぐ
			e.preventDefault();

			// クリックされたFeatureからポイントの種類を取得
			// features 配列はクリック位置にあるFeatureの配列
			const clickedFeature = e.features && e.features.length > 0 ? e.features[0] : null;
			const type = clickedFeature?.properties?.type as 'triangle' | 'contents' | undefined;

			// 有効なFeatureのtypeが取得できなければ何もしない
			if (!type) return;

			if (!map) return;

			isDragging = true; // ドラッグ状態を開始
			const canvas = map.getCanvasContainer();
			canvas.style.cursor = 'grabbing'; // カーソルを「掴んでいる」表示に

			// --- 修正箇所 ---
			// mousemove ハンドラをインラインではなく変数に格納
			activeMouseMoveListener = (moveEvent: MapMouseEvent) => handleMouseMove(moveEvent, type);

			// mouseup ハンドラも変数に格納（handleMouseUp 関数自体を使用）
			activeMouseUpListener = handleMouseUp; // handleMouseUp 関数がクリーンアップも兼ねる

			// マップインスタンスにイベントリスナーを登録
			map.on('mousemove', activeMouseMoveListener);
			map.once('mouseup', activeMouseUpListener); // mouseup は一度だけ発火すればよいので once を使用
		});
	});

	$effect(() => {
		const geojson = createGeojson(pointData);
		if (!map) return;
		const pointSource = map.getSource('point') as maplibregl.GeoJSONSource;
		if (pointSource) {
			pointSource.setData(geojson);
		}
	});

	// // 例として東京タワーの地理座標
	// const tokyoTowerLngLat = [139.7454, 35.6586]; // [経度, 緯度]

	// // 地理座標を画面のピクセル座標に変換
	// const screenPoint = map.project(tokyoTowerLngLat);

	// console.log(`東京タワーの地理座標: ${tokyoTowerLngLat}`);
	// console.log(`東京タワーの画面ピクセル座標: x=${screenPoint.x}, y=${screenPoint.y}`);
</script>

<div bind:this={mapContainer} class="w-hull h-full"></div>

<div
	bind:this={moveEl}
	class="pointer-events-none absolute left-0 top-0 z-10 h-12 w-12 bg-red-400"
></div>
