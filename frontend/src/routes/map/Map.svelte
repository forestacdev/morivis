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
	import { onMount } from 'svelte';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';

	import { mapStore } from '$map/store/map';
	import { DEBUG_MODE } from '$map/store/store';
	import JsonEditor from '$map/debug/JsonEditor.svelte';
	import GuiControl from '$map/debug/GuiControl.svelte';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
	let showJsonEditor = $state<{
		value: boolean;
	}>({ value: false });

	type LayerEntry = {
		id: string;
		source: string;
		type: string;
		layout: any;
		paint: any;
	};

	let layerDataEntries = $state<LayerEntry[] | undefined>([]); // レイヤーデータ
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ
	// mapStyleの作成
	const createMapStyle = () => {
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
				}
			},
			layers: [
				{
					id: 'pales_layer', // レイヤーのID
					source: 'pales', // ソースのID
					type: 'raster' // データタイプはラスターを指定
				}
			]
		};
		return mapStyle;
	};

	// 初期描画時
	onMount(() => {
		if (!mapContainer) return;
		const mapStyle = createMapStyle();
		if (!mapStyle) return;
		mapStore.init(mapContainer, mapStyle as StyleSpecification);
	});

	// 変更を監視して地図を更新（MapMenuのベースマップとレイヤー）

	$effect(() => {
		// console.log('layerDataEntries', layerDataEntries);
		$inspect(layerDataEntries);
		const mapStyle = createMapStyle();
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
		<JsonEditor map={mapStore.getMap()} />
	{/if}
	<GuiControl map={mapStore.getMap()} {showJsonEditor} />
{/if}

<div bind:this={mapContainer} class="h-full w-full"></div>

<style>
</style>
