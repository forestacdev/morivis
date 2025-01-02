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

	import LayerMenu from '$map/components/LayerMenu.svelte';
	import LayerOptionMenu from '$map/components/LayerOptionMenu.svelte';
	import Menu from '$map/components/Menu.svelte';
	import type { GeoDataEntry } from '$map/data';
	import { geoDataEntry } from '$map/data';
	import Draggable from '$map/debug/Draggable.svelte';
	import GuiControl from '$map/debug/GuiControl.svelte';
	import JsonEditor from '$map/debug/JsonEditor.svelte';
	import { debugJson } from '$map/debug/store';
	import { mapStore } from '$map/store/map';
	import { createLayersItems } from '$routes/map/layers';
	import { createSourcesItems } from '$routes/map/sources';
	import { DEBUG_MODE } from '$routes/map/store';
	import { addedLayerIds, showLayerOptionId } from '$routes/map/store';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
	let showJsonEditor = $state<{
		value: boolean;
	}>({ value: false });
	let tempLayerEntries = $state<GeoDataEntry[]>([]); // 一時レイヤーデータ
	let layerEntries = $state<GeoDataEntry[]>(geoDataEntry); // レイヤーデータ

	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ
	let layerToEdit = $state<GeoDataEntry | undefined>(undefined); // 編集中のレイヤー

	// mapStyleの作成
	const createMapStyle = async (_dataEntries: GeoDataEntry[]): Promise<StyleSpecification> => {
		// ソースとレイヤーの作成
		const sources = await createSourcesItems(_dataEntries);
		const layers = await createLayersItems(_dataEntries);

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

		return mapStyle as StyleSpecification;
	};

	// レイヤーの追加
	addedLayerIds.subscribe((ids) => {
		const filteredDataEntry = [...geoDataEntry, ...tempLayerEntries].filter((entry) =>
			ids.includes(entry.id)
		);

		// idsの順番に並び替え
		layerEntries = filteredDataEntry.sort((a, b) => {
			return ids.indexOf(a.id) - ids.indexOf(b.id);
		});
	});

	// 編集中のレイヤーの取得
	showLayerOptionId.subscribe((id) => {
		if (!id) {
			layerToEdit = undefined;
			return;
		} else {
			layerToEdit = layerEntries.find((entry) => entry.id === id);
		}
	});

	// 初期描画時
	onMount(async () => {
		if (!layerEntries) return;
		const mapStyle = await createMapStyle(layerEntries);
		if (!mapStyle || !mapContainer) return;
		mapStore.init(mapContainer, mapStyle as StyleSpecification);
	});

	$effect(() => {
		const currentEntries = $state.snapshot(layerEntries);
		let cancelled = false;

		(async () => {
			// 非同期処理の開始
			const mapStyle = await createMapStyle(currentEntries as GeoDataEntry[]);

			// 処理がキャンセルされていない場合にのみ適用
			if (!cancelled) {
				mapStore.setStyle(mapStyle);
			}
		})();
		// クリーンアップ処理
		return () => {
			cancelled = true;
		};
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

<!-- <Menu /> -->

<LayerMenu bind:layerEntries />
<LayerOptionMenu bind:layerToEdit bind:tempLayerEntries />
<div bind:this={mapContainer} class="h-full w-full"></div>
<!-- <div class="z-100 absolute bottom-0 right-0 max-h-[300px] max-w-[300px] overflow-auto bg-white p-2">
	{JSON.stringify(layerEntries, null, 2)}
</div> -->
{#if $DEBUG_MODE}
	{#if showJsonEditor.value}
		<Draggable left={0} top={0}>
			<JsonEditor map={mapStore.getMap()} />
		</Draggable>
	{/if}

	<GuiControl map={mapStore.getMap()} {showJsonEditor} />
{/if}

<style>
</style>
