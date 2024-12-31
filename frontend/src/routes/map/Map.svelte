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
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import { onMount } from 'svelte';

	import type { GeoDataEntry } from '$map/data';
	import { geoDataEntry } from '$map/data';

	import Draggable from '$map/debug/Draggable.svelte';
	import GuiControl from '$map/debug/GuiControl.svelte';
	import JsonEditor from '$map/debug/JsonEditor.svelte';
	import { debugJson } from '$map/debug/store';
	import { mapStore } from '$map/store/map';
	import { DEBUG_MODE } from '$routes/map/store';
	import { createSourcesItems } from '$map/utils/sources';
	import { createLayersItems } from '$map/utils/layers';
	import { addedLayerIds } from '$routes/map/store';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
	let showJsonEditor = $state<{
		value: boolean;
	}>({ value: false });
	let layerDataEntries = $state<GeoDataEntry | null>(geoDataEntry); // レイヤーデータ
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	// mapStyleの作成
	const createMapStyle = (_dataEntries: GeoDataEntry) => {
		// ソースとレイヤーの作成
		const sources = createSourcesItems(_dataEntries);
		const layers = createLayersItems(_dataEntries);

		const mapStyle = {
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
				...sources
			},
			layers: [
				{
					id: 'pales_layer', // レイヤーのID
					source: 'pales', // ソースのID
					type: 'raster' // データタイプはラスターを指定
				},
				...layers
			]
		};

		// NOTE:debug
		if (import.meta.env.DEV) debugJson.set(mapStyle);

		return mapStyle;
	};

	// 初期描画時
	onMount(() => {
		const mapStyle = createMapStyle(geoDataEntry);

		if (!mapStyle || !mapContainer) return;

		mapStore.init(mapContainer, mapStyle as StyleSpecification);

		addedLayerIds.subscribe((ids) => {
			const filteredDataEntry = Object.fromEntries(
				Object.entries(geoDataEntry).filter(([key]) => ids.includes(key))
			);
			layerDataEntries = filteredDataEntry;
		});
	});

	// 変更を監視して地図を更新（MapMenuのベースマップとレイヤー）

	$effect(() => {
		if (!layerDataEntries || mapContainer) return;
		// console.log('layerDataEntries', layerDataEntries);
		const mapStyle = createMapStyle(layerDataEntries);
		mapStore.setStyle(mapStyle as StyleSpecification);
	});

	mapStore.onClick((e) => {
		console.log('click', e);
	});

	mapStore.onSetStyle((e) => {});

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

{#if $DEBUG_MODE}
	{#if showJsonEditor.value}
		<Draggable left={0} top={0}>
			<JsonEditor map={mapStore.getMap()} />
		</Draggable>
	{/if}

	<GuiControl map={mapStore.getMap()} {showJsonEditor} />
{/if}

<div bind:this={mapContainer} class="h-full w-full"></div>

<style>
</style>
