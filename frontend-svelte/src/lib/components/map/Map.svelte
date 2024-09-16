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
	import Side from '$lib/components/ui/Side.svelte';
	import DataMenu from '$lib/components/ui/DataMenu.svelte';
	import LayerMenu from '$lib/components/ui/LayerMenu.svelte';
	import Loading from '$lib/components/ui/Loading.svelte';
	import LockOn from '$lib/components/marker/LockOn.svelte';
	import InfoPopup from '$lib/components/popup/InfoPopup.svelte';
	import ForestPopup from '$lib/components/popup/ForestPppup.svelte';
	import ThreeCanvas from '$lib/components/three/canvas.svelte';
	// import SelectPopup from '$lib/components/popup/SelectPopup.svelte';
	import Control from '$lib/components/ui/Control.svelte';
	import LayerOptionMenu from '$lib/components/ui/layermenu/LayerOptionMenu.svelte';
	import SearchMenu from '$lib/components/ui/SearchMenu.svelte';
	import type { LayerEntry } from '$lib/data/types';

	// import VectorMenu from '$lib/components/VectorMenu.svelte';
	import {
		createSourceItems,
		createLayerItems,
		createHighlightLayer,
		type SelectedHighlightData
	} from '$lib/data/layers';
	import { layerData } from '$lib/data/layers';
	import { onMount } from 'svelte';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import {
		isSide,
		excludeIdsClickLayer,
		addedLayerIds,
		clickableLayerIds,
		showDataMenu
	} from '$lib/store/store';
	import { getTilePixelColor, getTileUrl, getFieldDictJson } from '$lib/utils/map';
	import { webglToPng } from '$lib/utils/image';
	import styleJson from '$lib/json/fac_style.json';
	import { INT_ADD_LAYER_IDS } from '$lib/constants';
	import gsap from 'gsap';

	import { mapStore } from '$lib/store/map';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);

	let layerDataEntries: LayerEntry[] = layerData; // カテゴリごとのレイヤーデータ情報
	// let backgroundIds: string[] = Object.keys(backgroundSources); // ベースマップのIDの配列
	// let selectedBackgroundId: string = Object.keys(backgroundSources)[0]; // 選択されたベースマップのID
	// let mapInstance: Map | null = null; // Mapインスタンス
	let mapContainer: HTMLDivElement | null = null; // Mapコンテナ

	let selectFeatureList: [];
	let targetDemData: string | null = null;

	let selectedhighlightData: null | SelectedHighlightData = null;

	let mapBearing = 0;

	let feature;
	let clickedLayerId: string;

	// 画面振動
	const shakeScreen = () => {
		if (!mapContainer) return;
		gsap.to('body', {
			duration: 0.1,
			y: '+=10',
			yoyo: true,
			repeat: 1,
			ease: 'power1.inOut'
		});
	};

	// mapStyleの作成
	const createMapStyle = () => {
		const mapStyleJson = { ...styleJson } as StyleSpecification;
		if (!mapStyleJson) return;
		mapStyleJson.sources['terrain'] = gsiTerrainSource;
		mapStyleJson.sources = {
			...mapStyleJson.sources,
			...createSourceItems(
				layerDataEntries
					.filter((entry) => $addedLayerIds.includes(entry.id))
					.sort((a, b) => $addedLayerIds.indexOf(a.id) - $addedLayerIds.indexOf(b.id))
			),
			tile_source: {
				type: 'vector',
				tiles: ['tiles://{z}/{x}/{y}.pbf']
			}
		};
		mapStyleJson.layers = [
			...mapStyleJson.layers,
			...createLayerItems(
				layerDataEntries
					.filter((entry) => $addedLayerIds.includes(entry.id))
					.sort((a, b) => $addedLayerIds.indexOf(a.id) - $addedLayerIds.indexOf(b.id)),
				selectedhighlightData
			),
			{
				id: 'tile_layer',
				type: 'line',
				source: 'tile_source',
				'source-layer': 'geojsonLayer',
				paint: {
					'line-color': '#ffffff',
					'line-opacity': 0.5
				}
			},
			{
				id: 'tile_layer_symbol',
				type: 'symbol',
				source: 'tile_source',
				'source-layer': 'geojsonLayer',
				layout: {
					'text-field': ['get', 'name'],
					'text-size': 20,
					'text-allow-overlap': true
				},
				paint: {
					'text-color': '#ffffff',
					'text-halo-color': '#000000',
					'text-halo-width': 1
				}
			}
		];

		if (mapStore.getTerrain()) {
			mapStyleJson.terrain = {
				source: 'terrain',
				exaggeration: 1
			};
		}

		return mapStyleJson;
	};

	// 初期描画時
	onMount(() => {
		if (!mapContainer) return;

		const mapStyle = createMapStyle();

		if (import.meta.env.DEV) console.log(mapStyle);

		if (!mapStyle) return;

		mapStore.init(mapContainer, mapStyle as StyleSpecification);

		// クリックイベントの購読
		const onClick = mapStore.onClick(async (e) => {
			if (!e) return;
			const div = document.createElement('div');
			const lockOnInstance = new LockOn({
				target: div,
				props: {
					lngLat: e.lngLat
				}
			});
			lockOnInstance.$on('click', (event) => {
				console.log('click', event);
				mapStore.removeLockonMarker();
			});

			lockOnInstance.$on('scan', (e) => {
				console.log('scan', e.detail);
				// const lngLat = e.detail;
				// console.log('lngLat', lngLat);
				// const tileImage = getTileUrl(lngLat.lng, lngLat.lat, mapStore.getZoom());
				// console.log('tileImage', tileImage);
			});

			mapStore.removeLockonMarker();
			mapStore.addLockonMarker(div, e.lngLat);

			let features = mapStore.queryRenderedFeatures(e.point, {
				layers: $clickableLayerIds
			});

			// NOTE: debug
			if (import.meta.env.DEV) console.log('click', features);

			if (!features) return;
			// features = features.filter((feature) => {
			// 	return !$excludeIdsClickLayer.includes(feature.layer.id);
			// });

			if (features.length === 0) {
				selectFeatureList = [];
				feature = null;
				return;
			}

			const targetLayerData = layerDataEntries.find(
				(entry) => entry.id === features[0].layer.id
			);

			type FlexibleProp = {
				[key: string]: string | number;
			};

			function convertProps(
				prop1: FlexibleProp,
				prop2: { [key: string]: string }
			): FlexibleProp {
				const result: FlexibleProp = {};

				for (const [key, value] of Object.entries(prop1)) {
					if (prop2.hasOwnProperty(key)) {
						result[prop2[key]] = value;
					} else {
						result[key] = value; // キーが prop2 に存在しない場合は元のキーを使用
					}
				}

				return result;
			}

			if (targetLayerData) {
				selectedhighlightData = {
					LayerData: targetLayerData,
					featureId: features[0].id
				};

				if (targetLayerData.fieldDict) {
					const dictJson = await getFieldDictJson(targetLayerData.fieldDict);

					const convertedProp = convertProps(features[0].properties, dictJson);

					features[0].properties = convertedProp;

					feature = features[0];
					return;
				}

				feature = features[0] ? features[0] : null;
				clickedLayerId = targetLayerData.id;
			}
		});

		return () => {
			onClick();
		};
	});

	// 変更を監視して地図を更新（MapMenuのベースマップとレイヤー）
	$: if (layerDataEntries && selectedhighlightData !== undefined && $addedLayerIds) {
		const mapStyle = createMapStyle();

		// mapInstance.getTerrain() ? (mapStyle.terrain = gsiTerrainSource) : null;
		mapStore.setStyle(mapStyle as StyleSpecification);
	}

	// $: if (mapInstance && selectedhighlightData) {
	// 	const mapStyle = createMapStyle();
	// 	// mapInstance.getTerrain() ? (mapStyle.terrain = gsiTerrainSource) : null;
	// 	mapInstance.setStyle(mapStyle as StyleSpecification);

	// 	// NOTE: debug
	// 	if (import.meta.env.DEV) console.log('mapstyle', mapStyle);
	// }

	$: createHighlightLayer(selectedhighlightData);

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

<Side />

<LayerMenu bind:layerDataEntries {clickedLayerId} />
<SearchMenu />
<div class="relative h-full w-full">
	<div class="absolute z-0 h-full w-full bg-black">
		<div
			bind:this={mapContainer}
			class="bg-bla h-full w-full transition-all duration-200 {$isSide === 'info'
				? 'custom-brah scale-[1.05]'
				: ''}"
		></div>
	</div>
	<DataMenu bind:layerDataEntries />
</div>
<LayerOptionMenu bind:layerDataEntries />
<div class="custom-css absolute right-[60px] top-2 max-h-[calc(100vh-8rem)] w-[300px]">
	<!-- {#if lockOnMarker}
		<button on:click={getElevation}>この地点の標高</button>
	{/if} -->

	<!-- <SelectPopup {selectFeatureList} on:closePopup={removeLockonMarker} /> -->
	<InfoPopup {feature} />
	<!-- <ForestPopup /> -->
</div>

<Loading />

<!-- <ThreeCanvas {targetDemData} /> -->

<!-- <Control on:setMapBearing={setMapBearing} on:setMapZoom={setMapZoom} /> -->

<style>
	.custom-css {
		perspective: 1000px;
		transform-style: preserve-3d;
	}

	.custom-brah {
		filter: blur(6px);
	}
</style>
