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
	import ForestPopup from '$lib/components/popup/ForestPppup.svelte';
	import ThreeCanvas from '$lib/components/three/canvas.svelte';
	// import SelectPopup from '$lib/components/popup/SelectPopup.svelte';
	import Control from '$lib/components/Control.svelte';
	import LayerOptionMenu from './LayerMenu/LayerOptionMenu.svelte';
	// import VectorMenu from '$lib/components/VectorMenu.svelte';
	import {
		createSourceItems,
		createLayerItems,
		createHighlightLayer,
		backgroundSources,
		type LayerEntry,
		type SelectedHighlightData
	} from '$lib/utils/layers';
	import { layerData } from '$lib/utils/layers';
	import { onMount } from 'svelte';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import { isSide, excludeIdsClickLayer } from '$lib/store/store';
	import { getTilePixelColor, getTileUrl, getStyleJson } from '$lib/utils/map';
	import { webglToPng } from '$lib/utils/image';
	import styleJson from '$lib/json/fac_style.json';

	import { mapStore } from '$lib/store/map';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);

	let layerDataEntries: LayerEntry[] = layerData; // カテゴリごとのレイヤーデータ情報
	let backgroundIds: string[] = Object.keys(backgroundSources); // ベースマップのIDの配列
	let selectedBackgroundId: string = Object.keys(backgroundSources)[0]; // 選択されたベースマップのID
	// let mapInstance: Map | null = null; // Mapインスタンス
	let mapContainer: HTMLDivElement | null = null; // Mapコンテナ

	let selectFeatureList: [];
	let targetDemData: string | null = null;

	let selectedhighlightData: null | SelectedHighlightData = null;

	let mapBearing = 0;

	let feature;

	// mapStyleの作成
	const createMapStyle = () => {
		const mapStyleJson = { ...styleJson } as StyleSpecification;
		if (!mapStyleJson) return;
		mapStyleJson.sources['mino-dem'] = gsiTerrainSource;
		mapStyleJson.sources = {
			...mapStyleJson.sources
			// ...createSourceItems(layerDataEntries)
		};
		mapStyleJson.layers = [
			...mapStyleJson.layers
			// ...createLayerItems(layerDataEntries, selectedhighlightData)
		];

		return mapStyleJson;
	};

	// 初期描画時
	onMount(() => {
		if (!mapContainer) return;

		const mapStyle = createMapStyle();

		console.log(mapStyle);

		if (!mapStyle) return;

		mapStore.init(mapContainer, mapStyle as StyleSpecification);

		// クリックイベントの購読
		const onClick = mapStore.onClick(async (e) => {
			if (!e) return;
			const div = document.createElement('div');
			const lockOnInstance = new LockOn({
				target: div
			});
			lockOnInstance.$on('click', (event) => {
				mapStore.removeLockonMarker();
			});

			mapStore.removeLockonMarker();
			mapStore.addLockonMarker(div, e.lngLat);

			mapStore.panTo(e.lngLat, { duration: 1000 });

			let features = mapStore.queryRenderedFeatures(e.point);

			// NOTE: debug
			if (import.meta.env.DEV) console.log('click', features);

			if (!features) return;
			features = features.filter((feature) => {
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

			// console.log(targetLayerData.id_field);

			if (targetLayerData && targetLayerData.id_field) {
				selectedhighlightData = {
					LayerData: targetLayerData,
					featureId: features[0].properties[targetLayerData.id_field]
				};
			}

			feature = features[0] ? features[0] : null;
			// selectFeatureList = [];
		});

		return () => {
			onClick();
		};
	});

	// 変更を監視して地図を更新（MapMenuのベースマップとレイヤー）
	$: if (layerDataEntries && selectedBackgroundId && selectedhighlightData !== undefined) {
		const mapStyle = createMapStyle();

		// mapInstance.getTerrain() ? (mapStyle.terrain = gsiTerrainSource) : null;
		mapStore.setStyle(mapStyle as StyleSpecification);

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
	// const setMapBearing = (e) => {
	// 	const mapBearing = e.detail;
	// 	// mapInstance?.setBearing(mapBearing);

	// 	mapInstance?.easeTo({ bearing: mapBearing, duration: 1000 });
	// };

	// // マップのズーム
	// const setMapZoom = (e) => {
	// 	const mapZoom = e.detail;
	// 	mapInstance?.easeTo({
	// 		zoom: mapZoom,
	// 		duration: 1000
	// 	});
	// };
</script>

<div bind:this={mapContainer} class="h-full w-full"></div>
<Side />
<div
	class="custom-css absolute left-[120px] top-[60px] h-full max-h-[calc(100vh-8rem)] max-w-[300px]"
>
	<BaseMenu {backgroundIds} bind:selectedBackgroundId {backgroundSources} />
	<LayerMenu bind:layerDataEntries />
</div>

<LayerOptionMenu bind:layerDataEntries />
<div class="custom-css absolute right-[60px] top-2 max-h-[calc(100vh-8rem)] w-[300px]">
	<!-- {#if lockOnMarker}
		<button on:click={getElevation}>この地点の標高</button>
	{/if} -->

	<!-- <SelectPopup {selectFeatureList} on:closePopup={removeLockonMarker} /> -->
	<!-- <InfoPopup {feature} /> -->
	<ForestPopup />
</div>

<!-- <ThreeCanvas {targetDemData} /> -->

<!-- <Control on:setMapBearing={setMapBearing} on:setMapZoom={setMapZoom} /> -->

<style>
	.custom-css {
		perspective: 1000px;
		transform-style: preserve-3d;
	}
</style>
