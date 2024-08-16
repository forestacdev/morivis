<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import Side from '$lib/components/Side.svelte';
	import MapMenu from '$lib/components/MapMenu.svelte';
	import BaseMenu from '$lib/components/BaseMenu.svelte';
	import { type CategoryEntry, backgroundSources } from '$lib/utils/layers';
	import { layerData } from '$lib/utils/layers';
	import { onMount } from 'svelte';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import { isSide } from '$lib/store/store';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);

	let layerDataEntries: CategoryEntry[] = layerData; // カテゴリごとのレイヤーデータ情報
	let backgroundIds: string[] = Object.keys(backgroundSources); // ベースマップのIDの配列
	let selectedBackgroundId: string = Object.keys(backgroundSources)[0]; // 選択されたベースマップのID
	let mapInstance: Map | null = null; // Mapインスタンス
	let layerIdNameDict: { [_: string]: string } = {};

	// sourcesの作成
	const createSourceItems = () => {
		const sourceItems: { [_: string]: SourceSpecification } = {};

		layerDataEntries.forEach((categoryEntry) => {
			categoryEntry.layers.forEach((layerEntry) => {
				const sourceId = `${categoryEntry.categoryId}_${layerEntry.id}_source`;

				if (layerEntry.type === 'xyz') {
					sourceItems[sourceId] = {
						type: 'raster',
						tiles: [layerEntry.path],
						attribution: layerEntry.attribution
					};
				} else {
					console.warn(`Unknown layer type: ${layerEntry.type}`);
				}
			});
		});

		return sourceItems;
	};

	// layersの作成
	const createLayerItems = () => {
		let layerItems: LayerSpecification[] = [];

		layerDataEntries.filter((categoryEntry) => {
			categoryEntry.layers
				.filter((layerEntry) => layerEntry.visible)
				.reverse()
				.forEach((layerEntry) => {
					const layerId = `${categoryEntry.categoryId}_${layerEntry.id}`;
					const sourceId = `${categoryEntry.categoryId}_${layerEntry.id}_source`;

					if (layerEntry.type === 'xyz') {
						layerItems.push({
							id: layerId,
							type: 'raster',
							source: sourceId,
							minzoom: 8,
							maxzoom: 18,
							paint: { 'raster-opacity': layerEntry.opacity }
						});
						layerIdNameDict[layerId] = layerEntry.name;
					} else {
						console.warn(`Unknown layer type: ${layerEntry.type}`);
					}
				});
		});

		return layerItems;
	};

	// mapStyleの作成
	const createMapStyle = () => {
		const mapStyle: StyleSpecification = {
			version: 8,
			glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
			sources: {
				terrain: gsiTerrainSource, // 地形ソース
				...createSourceItems(),
				...backgroundSources
			},
			layers: [
				{
					id: 'background',
					source: selectedBackgroundId,
					type: 'raster'
				},
				...createLayerItems()
			]
		};

		return mapStyle;
	};

	// 初期描画時
	onMount(() => {
		const map = new maplibregl.Map({
			container: 'map',
			style: createMapStyle(),
			center: [136.92300400916308, 35.5509525769706] as [number, number], // starting position [lng, lat]
			zoom: 14.5,
			maxZoom: 18,
			maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
		});
		mapInstance = map;

		// コントロールの追加
		map.addControl(new maplibregl.NavigationControl({}), 'top-right');
		map.addControl(new maplibregl.GeolocateControl({}), 'top-right');
		map.addControl(new maplibregl.ScaleControl({}), 'bottom-left');
		map.addControl(
			new maplibregl.TerrainControl({
				source: 'terrain', // 地形ソースを指定
				exaggeration: 1 // 高さの倍率
			}),
			'top-right' // コントロールの位置を指定
		);
	});

	// 変更を監視して地図を更新（MapMenuのベースマップとレイヤー）
	$: if (layerDataEntries && selectedBackgroundId && mapInstance) {
		const mapStyle = createMapStyle();
		mapInstance.setStyle(mapStyle as StyleSpecification);
	}
</script>

<div id="map" class="h-full w-full"></div>
<Side />
<div class="custom-css absolute left-[70px] top-2 h-full max-h-[calc(100vh-8rem)] w-[300px]">
	<BaseMenu {backgroundIds} bind:selectedBackgroundId />
	<MapMenu bind:layerDataEntries />
</div>

<style>
	.custom-css {
		perspective: 1000px;
		transform-style: preserve-3d;
	}
</style>
