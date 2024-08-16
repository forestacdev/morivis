<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import MapMenu from '$lib/components/MapMenu.svelte';
	import { type CategoryEntry, backgroundSources } from '$lib/utils/layers';
	import { categoryEntries } from '$lib/utils/layers';
	import { onMount } from 'svelte';

	let refCategoryEntries: CategoryEntry[] = categoryEntries; // カテゴリごとのレイヤーデータ情報
	let backgroundIds: string[] = Object.keys(backgroundSources); // ベースマップのIDの配列
	let selectedBackgroundId: string = Object.keys(backgroundSources)[0]; // 選択されたベースマップのID
	let mapInstance: Map | null = null; // Mapインスタンス
	let layerIdNameDict: { [_: string]: string } = {};

	// sourcesの作成
	const createSourceItems = () => {
		const sourceItems: { [_: string]: SourceSpecification } = {};

		refCategoryEntries.forEach((categoryEntry) => {
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

		refCategoryEntries.filter((categoryEntry) => {
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
			maxPitch: 0,
			maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
		});
		mapInstance = map;

		// コントロールの追加
		map.addControl(new maplibregl.NavigationControl({}), 'top-right');
		map.addControl(new maplibregl.GeolocateControl({}), 'top-right');
		map.addControl(new maplibregl.ScaleControl({}), 'bottom-left');
	});

	// 変更を監視して地図を更新（MapMenuのベースマップとレイヤー）
	$: if (refCategoryEntries && selectedBackgroundId && mapInstance) {
		const mapStyle = createMapStyle();
		mapInstance.setStyle(mapStyle as StyleSpecification);
	}
</script>

<div id="map" class="h-full w-full"></div>
<MapMenu {backgroundIds} bind:selectedBackgroundId bind:refCategoryEntries />

<style>
</style>
