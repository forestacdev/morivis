<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker,
		CircleLayerSpecification
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import Side from '$lib/components/Side.svelte';
	import BaseMenu from '$lib/components/BaseMenu.svelte';
	import LayerMenu from '$lib/components/LayerMenu.svelte';
	import LockOn from '$lib/components/Marker/LockOn.svelte';
	import InfoPopup from '$lib/components/popup/InfoPopup.svelte';
	import ThreeCanvas from '$lib/components/three/canvas.svelte';
	// import SelectPopup from '$lib/components/popup/SelectPopup.svelte';
	import Control from '$lib/components/Control.svelte';
	import LayerOptionMenu from './LayerMenu/LayerOptionMenu.svelte';
	// import VectorMenu from '$lib/components/VectorMenu.svelte';
	import {
		createSourceItems,
		createLayerItems,
		type LayerEntry,
		backgroundSources
	} from '$lib/utils/layers';
	import { layerData } from '$lib/utils/layers';
	import { onMount } from 'svelte';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import { isSide, excludeIdsClickLayer } from '$lib/store/store';
	import { getTilePixelColor, getTileUrl } from '$lib/utils/map';

	// const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);

	let layerDataEntries: LayerEntry[] = layerData; // カテゴリごとのレイヤーデータ情報
	let backgroundIds: string[] = Object.keys(backgroundSources); // ベースマップのIDの配列
	let selectedBackgroundId: string = Object.keys(backgroundSources)[0]; // 選択されたベースマップのID
	let mapInstance: Map | null = null; // Mapインスタンス

	let lockOnMarker: Marker | null = null;
	let selectFeatureList: [];
	let targetDemData: string | null = null;

	type SelectedHighlightData = {
		LayerData: LayerEntry;
		featureId: string;
	};

	let selectedhighlightData: null | SelectedHighlightData = null;

	let mapBearing = 0;

	let feature;

	const createHighlightLayer = (selectedhighlightData: SelectedHighlightData | null) => {
		if (!selectedhighlightData) return [];

		const layerEntry = selectedhighlightData.LayerData;

		const layerId = 'HighlightFeatureId';
		const sourceId = `${layerEntry.id}_source`;

		const layers = [];

		if (layerEntry.type === 'vector-polygon') {
			layers.push({
				id: layerId,
				type: 'fill',
				source: sourceId,
				'source-layer': layerEntry.source_layer,
				paint: {
					'fill-color': 'green',
					'fill-opacity': 0.4
				},
				filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			} as LayerSpecification);
		} else if (layerEntry.type === 'vector-line') {
			layers.push({
				id: layerId,
				type: 'line',
				source: sourceId,
				'source-layer': layerEntry.source_layer,
				paint: {
					'line-color': 'green',
					'line-opacity': 0.5
				},
				filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			} as LayerSpecification);
		} else if (layerEntry.type === 'vector-point') {
			layers.push({
				id: layerId,
				type: 'circle',
				source: sourceId,
				'source-layer': layerEntry.source_layer,
				paint: {
					'circle-opacity': 0.5,
					'circle-color': 'green'
				},
				filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			} as CircleLayerSpecification);
		} else if (layerEntry.type === 'geojson-polygon') {
			layers.push({
				id: layerId,
				type: 'fill',
				source: sourceId,
				paint: {
					'fill-color': 'green',
					'fill-opacity': 0.5
				},
				filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			} as LayerSpecification);

			layers.push({
				id: layerId + '_line',
				type: 'line',
				source: sourceId,
				paint: {
					'line-color': '#fff',
					'line-opacity': 0.5,
					'line-width': 5,
					'line-blur': 1
				},
				filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			} as LayerSpecification);
		} else if (layerEntry.type === 'geojson-line') {
			layers.push({
				id: layerId,
				type: 'line',
				source: sourceId,
				paint: {
					'line-color': '#ff0000',
					'line-opacity': 0.5
				},
				filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
			} as LayerSpecification);
		} else if (layerEntry.type === 'geojson-point') {
			layers.push({
				id: layerId,
				type: 'circle',
				source: sourceId,
				paint: {
					'circle-opacity': 0.5,
					'circle-color': '#ff0000'
				},
				filter: ['==', ['get', layerEntry.id_field], selectedhighlightData.featureId]
				// filter: ['==', 'id', selectedhighlightData.featureId]
			} as LayerSpecification);
		} else {
			console.warn(`Unknown layer type: ${layerEntry.type}`);
			return [];
		}

		// mapInstance?.getLayer(layerId) && mapInstance?.removeLayer(layerId);

		// mapInstance?.addLayer(layer);
		return layers;
	};

	// mapStyleの作成
	const createMapStyle = () => {
		const mapStyle: StyleSpecification = {
			version: 8,
			glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
			sources: {
				// ...createHighlightSource(),
				...createSourceItems(layerDataEntries),
				...backgroundSources
				// ...createHighlightSource()
			},
			layers: [
				{
					id: 'background',
					source: selectedBackgroundId,
					type: 'raster'
				},
				...createLayerItems(layerDataEntries),

				...((createHighlightLayer(selectedhighlightData) ?? []) as LayerSpecification[])
			]
		};

		return mapStyle;
	};

	class CustomTerrainControl extends maplibregl.TerrainControl {
		constructor(options: TerrainSpecification) {
			super(options);
		}

		onAdd(map: Map) {
			const container = super.onAdd(map);
			this._terrainButton.addEventListener('click', this.customClickHandler);
			return container;
		}

		// ３D表示の時に地図を傾ける
		customClickHandler = () => {
			this._map.getTerrain()
				? this._map.easeTo({ pitch: 60 })
				: this._map.easeTo({ pitch: 0 });
		};
	}

	// 初期描画時
	onMount(() => {
		const map = new maplibregl.Map({
			container: 'map',
			style: createMapStyle(),
			center: [136.92300400916308, 35.5509525769706] as [number, number], // starting position [lng, lat]
			zoom: 14.5,
			// maxZoom: 18,
			maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
		});
		mapInstance = map;

		// コントロールの追加
		map.addControl(new maplibregl.NavigationControl({}), 'top-right');
		map.addControl(new maplibregl.GeolocateControl({}), 'top-right');
		map.addControl(new maplibregl.ScaleControl({}), 'bottom-left');
		map.addControl(
			new CustomTerrainControl({
				source: 'terrainSource', // 地形ソースを指定
				exaggeration: 1 // 高さの倍率
			}),
			'top-right' // コントロールの位置を指定
		);

		mapInstance.on('click', async (e) => {
			if (mapInstance === null) return;

			const div = document.createElement('div');
			const lockOnInstance = new LockOn({
				target: div
			});
			lockOnInstance.$on('click', (event) => {
				removeLockonMarker();
			});
			if (lockOnMarker) removeLockonMarker();
			lockOnMarker = new maplibregl.Marker({ element: div })
				.setLngLat(e.lngLat)
				.addTo(mapInstance);

			mapInstance.panTo(e.lngLat, { duration: 1000 });

			const features = mapInstance.queryRenderedFeatures(e.point).filter((feature) => {
				return !$excludeIdsClickLayer.includes(feature.layer.id);
			});

			if (features.length === 0) {
				selectFeatureList = [];
				feature = null;
				return;
			}

			const targetLayerData = layerDataEntries.find(
				(entry) => entry.id === features[0].layer.id
			);

			// NOTE: debug
			if (import.meta.env.DEV) console.log('click', features);

			console.log(targetLayerData.id_field);

			if (targetLayerData && targetLayerData.id_field) {
				selectedhighlightData = {
					LayerData: targetLayerData,
					featureId: features[0].properties[targetLayerData.id_field]
				};
			}

			feature = features[0] ? features[0] : null;
			// selectFeatureList = [];
		});

		mapInstance.on('rotate', (e) => {
			console.log();
			// 角度が負の場合、360を足して0〜360度に変換
			const bearing360 = (Number(e.target.getBearing().toFixed(1)) + 360) % 360;
			mapBearing = bearing360;
		});

		// 不足分のアイコンを生成

		// mapInstance.on('styleimagemissing', (e) => {
		// 	const id = e.id; // id of the missing image

		// 	console.log(id);

		// 	// check if this missing icon is one this function can generate
		// 	const prefix = 'square-rgb-';
		// 	if (id.indexOf(prefix) !== 0) return;

		// 	// extract the color from the id
		// 	const rgb = [200, 200, 200];

		// 	const width = 64; // The image will be 64 pixels square
		// 	const bytesPerPixel = 4; // Each pixel is represented by 4 bytes: red, green, blue, and alpha.
		// 	const data = new Uint8Array(width * width * bytesPerPixel);

		// 	for (let x = 0; x < width; x++) {
		// 		for (let y = 0; y < width; y++) {
		// 			const offset = (y * width + x) * bytesPerPixel;
		// 			data[offset + 0] = rgb[0]; // red
		// 			data[offset + 1] = rgb[1]; // green
		// 			data[offset + 2] = rgb[2]; // blue
		// 			data[offset + 3] = 255; // alpha
		// 		}
		// 	}

		// 	mapInstance.addImage(id, { width, height: width, data });
		// });
	});

	// 変更を監視して地図を更新（MapMenuのベースマップとレイヤー）
	$: if (
		layerDataEntries &&
		selectedBackgroundId &&
		mapInstance &&
		selectedhighlightData !== undefined
	) {
		const mapStyle = createMapStyle();
		// mapInstance.getTerrain() ? (mapStyle.terrain = gsiTerrainSource) : null;
		mapInstance.setStyle(mapStyle as StyleSpecification);

		// NOTE: debug
		if (import.meta.env.DEV) console.log('mapstyle', mapStyle);
	}

	// $: if (mapInstance && selectedhighlightData) {
	// 	const mapStyle = createMapStyle();
	// 	// mapInstance.getTerrain() ? (mapStyle.terrain = gsiTerrainSource) : null;
	// 	mapInstance.setStyle(mapStyle as StyleSpecification);

	// 	// NOTE: debug
	// 	if (import.meta.env.DEV) console.log('mapstyle', mapStyle);
	// }

	$: createHighlightLayer(selectedhighlightData);

	// ロックオンマーカーを削除
	const removeLockonMarker = () => {
		if (lockOnMarker) lockOnMarker.remove();
		lockOnMarker = null;
		selectFeatureList = [];
		feature = null;
	};

	// 標高の取得
	const getElevation = async () => {
		console.log(lockOnMarker?.getLngLat());
		const lngLat = lockOnMarker?.getLngLat();
		if (!lngLat || !mapInstance) return;
		const zoom = Math.min(Math.round(mapInstance.getZoom()), 14);
		const rgba = await getTilePixelColor(
			lngLat.lng,
			lngLat.lat,
			zoom,
			'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'
		);

		if (!rgba) return;

		// RGB値を取得
		const r = rgba[0];
		const g = rgba[1];
		const b = rgba[2];

		// 高さを計算
		const rgb = r * 65536.0 + g * 256.0 + b;
		let h = 0.0;
		if (rgb < 8388608.0) {
			h = rgb * 0.01;
		} else if (rgb > 8388608.0) {
			h = (rgb - 16777216.0) * 0.01;
		}

		const tileurl = getTileUrl(
			lngLat.lng,
			lngLat.lat,
			14,
			'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'
		);
		targetDemData = tileurl;
	};

	// マップの回転
	const setMapBearing = (e) => {
		const mapBearing = e.detail;
		// mapInstance?.setBearing(mapBearing);

		mapInstance?.easeTo({ bearing: mapBearing, duration: 1000 });
	};

	// マップのズーム
	const setMapZoom = (e) => {
		const mapZoom = e.detail;
		mapInstance?.easeTo({
			zoom: mapZoom,
			duration: 1000
		});
	};
</script>

<div id="map" class="h-full w-full"></div>
<Side />
<div
	class="custom-css absolute left-[120px] top-[60px] h-full max-h-[calc(100vh-8rem)] max-w-[300px]"
>
	<BaseMenu {backgroundIds} bind:selectedBackgroundId {backgroundSources} />
	<LayerMenu bind:layerDataEntries />
</div>

<LayerOptionMenu bind:layerDataEntries />
<div class="custom-css absolute right-[60px] top-2 max-h-[calc(100vh-8rem)] w-[300px]">
	{#if lockOnMarker}
		<button on:click={getElevation}>この地点の標高</button>
	{/if}

	<!-- <SelectPopup {selectFeatureList} on:closePopup={removeLockonMarker} /> -->
	<InfoPopup {feature} />
</div>

<ThreeCanvas {targetDemData} />

<!-- <Control on:setMapBearing={setMapBearing} on:setMapZoom={setMapZoom} /> -->

<style>
	.custom-css {
		perspective: 1000px;
		transform-style: preserve-3d;
	}
</style>
