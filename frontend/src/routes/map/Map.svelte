<script lang="ts">
	import turfDissolve from '@turf/dissolve';
	import turfUnion from '@turf/union';
	import { debounce } from 'es-toolkit';
	import maplibregl from 'maplibre-gl';
	import type {
		StyleSpecification,
		MapGeoJSONFeature,
		SourceSpecification,
		CanvasSourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker,
		LngLat,
		Popup
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import { mount, onMount } from 'svelte';

	import ZoomControl from './components/control/ZoomControl.svelte';

	import Attribution from '$map/Attribution.svelte';
	// import CanvasLayer from '$routes/map/_CanvasLayer.svelte';
	import Compass from '$map/components/control/Compass.svelte';
	import DataManu from '$map/components/DataManu.svelte';
	import LayerMenu from '$map/components/LayerMenu.svelte';
	import Logo from '$map/components/Logo.svelte';
	import LegendPopup from '$map/components/popup/LegendPopup.svelte';
	import TablePopup from '$map/components/popup/TablePopup.svelte';
	import SideMenu from '$map/components/SideMenu.svelte';
	import { geoDataEntry } from '$map/data';
	import type { GeoDataEntry } from '$map/data/types';
	import type { ZoomLevel, CategoryLegend, GradientLegend } from '$map/data/types/raster';
	import Draggable from '$map/debug/Draggable.svelte';
	import GuiControl from '$map/debug/GuiControl.svelte';
	import JsonEditor from '$map/debug/JsonEditor.svelte';
	import { debugJson } from '$map/debug/store';
	import { mapStore } from '$map/store/map';
	import { convertToGeoJSONCollection } from '$map/utils/geojson';
	import { getPixelColor, getGuide } from '$map/utils/raster';
	import { MAPLIBRE_POPUP_OPTIONS } from '$routes/map/constants';
	import { createLayersItems } from '$routes/map/layers';
	import { createSourcesItems } from '$routes/map/sources';
	import {
		addedLayerIds,
		showLayerOptionId,
		clickableVectorIds,
		clickableRasterIds,
		DEBUG_MODE,
		selectedHighlightData
	} from '$routes/map/store';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
	let showJsonEditor = $state<{
		value: boolean;
	}>({ value: false });
	let tempLayerEntries = $state<GeoDataEntry[]>([]); // 一時レイヤーデータ
	let layerEntries = $state<GeoDataEntry[]>([]); // レイヤーデータ

	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	let maplibrePopup = $state<Popup | null>(null); // ポップアップ

	// TODO: CanvasLayerの実装
	// let canvasSource = $state<CanvasSourceSpecification>({
	// 	type: 'canvas',
	// 	canvas: 'canvas-layer',
	// 	coordinates: [
	// 		[136.91278, 35.556704],
	// 		[136.92986, 35.556704],
	// 		[136.92986, 35.543576],
	// 		[136.91278, 35.543576]
	// 	]
	// });

	// let canvasLayer = $state<LayerSpecification>({
	// 	id: 'canvas-layer',
	// 	type: 'raster',
	// 	source: 'canvasSource'
	// });

	// mapStyleの作成
	const createMapStyle = async (_dataEntries: GeoDataEntry[]): Promise<StyleSpecification> => {
		// ソースとレイヤーの作成
		const sources = await createSourcesItems(_dataEntries);
		const layers = await createLayersItems(_dataEntries);

		const terrain = mapStore.getTerrain();

		const mapStyle = {
			version: 8,
			glyphs: './font/{fontstack}/{range}.pbf', // TODO; フォントの検討
			sources: {
				terrain: gsiTerrainSource,
				...sources
				// canvasSource
			},
			layers: [...layers],
			terrain: terrain ? terrain : undefined
		};

		// NOTE:debug
		if (import.meta.env.DEV) debugJson.set(mapStyle);

		return mapStyle as StyleSpecification;
	};

	// レイヤーの追加
	addedLayerIds.subscribe((ids) => {
		if (import.meta.env.DEV) {
			const debugEntry = geoDataEntry.filter((entry) => entry.debug);
			if (debugEntry.length > 0) {
				debugEntry.forEach((entry) => {
					console.warn('デバッグデータのみ追加します。', entry.id);
				});
				layerEntries = [...debugEntry, ...tempLayerEntries];
				return;
			}
		}

		const filteredDataEntry = [...geoDataEntry, ...tempLayerEntries].filter((entry) =>
			ids.includes(entry.id)
		);

		// idsの順番に並び替え
		layerEntries = filteredDataEntry.sort((a, b) => {
			return ids.indexOf(a.id) - ids.indexOf(b.id);
		});
	});

	// 初期描画時
	onMount(async () => {
		if (!layerEntries) return;
		const mapStyle = await createMapStyle(layerEntries);
		if (!mapStyle || !mapContainer) return;
		mapStore.init(mapContainer, mapStyle as StyleSpecification);
	});

	const setStyleDebounce = debounce(async (entries: GeoDataEntry[]) => {
		const mapStyle = await createMapStyle(entries as GeoDataEntry[]);
		mapStore.setStyle(mapStyle);
	}, 100);

	$effect(() => {
		const currentEntries = $state.snapshot(layerEntries);
		setStyleDebounce(currentEntries as GeoDataEntry[]);
	});

	// selectedHighlightData.subscribe((data) => {
	// 	setStyleDebounce(layerEntries as GeoDataEntry[]);
	// });

	// ベクターポップアップの作成
	const generatePopup = (feature: MapGeoJSONFeature, _lngLat: LngLat) => {
		const popupContainer = document.createElement('div');
		mount(TablePopup, {
			target: popupContainer,
			props: {
				feature
			}
		});
		if (maplibrePopup) {
			maplibrePopup.remove();
		}

		maplibrePopup = new maplibregl.Popup(MAPLIBRE_POPUP_OPTIONS)
			.setLngLat(_lngLat)
			.setDOMContent(popupContainer)
			.addTo(mapStore.getMap() as maplibregl.Map);
	};

	// ラスターの色のガイドポップアップの作成
	const generateLegendPopup = (
		data: {
			color: string;
			label: string;
		},
		legend: CategoryLegend | GradientLegend,
		_lngLat: LngLat
	) => {
		const popupContainer = document.createElement('div');
		mount(LegendPopup, {
			target: popupContainer,
			props: {
				data,
				legend
			}
		});
		if (maplibrePopup) {
			maplibrePopup.remove();
		}

		maplibrePopup = new maplibregl.Popup(MAPLIBRE_POPUP_OPTIONS)
			.setLngLat(_lngLat)
			.setDOMContent(popupContainer)
			.addTo(mapStore.getMap() as maplibregl.Map);
	};

	// ラスターのクリックイベント
	const onRasterClick = async (lngLat: LngLat) => {
		if ($clickableRasterIds.length === 0) return;
		const map = mapStore.getMap();
		if (!map) return;

		//TODO: 複数のラスターの場合の処理
		const targetId = $clickableRasterIds[0];

		const targetEntry = layerEntries.find((entry) => entry.id === targetId);
		if (!targetEntry || targetEntry.type !== 'raster') return;
		const url = targetEntry.format.url;

		const tileSize = targetEntry.metaData.tileSize;
		const zoomOffset = tileSize === 512 ? 0.5 : tileSize === 256 ? +1.5 : 1;
		const zoom = Math.min(
			Math.round(map.getZoom() + zoomOffset),
			targetEntry.metaData.maxZoom
		) as ZoomLevel;

		const pixelColor = await getPixelColor(url, lngLat, zoom, tileSize, targetEntry.format.type);

		if (!pixelColor) {
			console.warn('ピクセルカラーが取得できませんでした。');
			return;
		}

		if (targetEntry.style.type === 'categorical') {
			const legend = targetEntry.style.legend;

			if (legend.type === 'category') {
				const data = getGuide(pixelColor, legend);

				generateLegendPopup(data, legend, lngLat);
			}
		}
	};

	// 地図のクリックイベント
	mapStore.onClick((e) => {
		// console.log('click', e);
		if (!e) return;
		const features = mapStore.queryRenderedFeatures(e.point, {
			layers: $clickableVectorIds
		});
		if (!features || features?.length === 0) {
			const lngLat = e.lngLat;
			onRasterClick(lngLat);
			return;
		}

		const feature = features[0];

		const lngLat = e.lngLat;

		const layerId = feature.layer.id;
		const featureId = feature.id as number;

		const entry = layerEntries.find((entry) => entry.id === layerId);
		if (!entry || featureId === undefined || entry.type !== 'vector') return;
		const propKes = entry.properties.keys;

		if (!propKes) return;

		feature.properties = Object.entries(feature.properties)
			.filter(([key, value]) => propKes.includes(key))
			.reduce<Record<string, string | number>>((acc, [key, value]) => {
				acc[key] = value;
				return acc;
			}, {});

		// console.log('features', features);

		// const highlightFeatures = features.filter((feature) => feature.layer.id === layerId);
		// const data = convertToGeoJSONCollection(highlightFeatures, featureId);

		// if (data.features.length === 0) return;

		// console.log('data', data);

		// let geojson;

		// if (data.features.length > 1) {
		// 	geojson = turfDissolve(data);
		// } else {
		// 	geojson = data;
		// }

		// if (!geojson) return;
		// ポッアップの作成
		// generatePopup(feature, lngLat);

		$selectedHighlightData = {
			layerData: entry,
			featureId
		};
	});

	mapStore.onSetStyle((e) => {});
</script>

<!-- <Menu /> -->

<div class="relative h-full w-full">
	<SideMenu />
	<LayerMenu bind:layerEntries bind:tempLayerEntries />
	<!-- <LayerOptionMenu bind:layerToEdit bind:tempLayerEntries /> -->
	<div bind:this={mapContainer} class="css-map h-full w-full flex-grow"></div>
	<!-- <CanvasLayer bind:canvasSource /> -->
	<Compass />
	<ZoomControl />
	<Attribution />
	<Logo />
	<DataManu />
</div>

{#if $DEBUG_MODE}
	{#if showJsonEditor.value}
		<Draggable left={0} top={0}>
			<JsonEditor map={mapStore.getMap()} />
		</Draggable>
	{/if}

	<GuiControl map={mapStore.getMap()} {showJsonEditor} />
{/if}

<style>
	/* maplibreのデフォルトの出典表記を非表示 */
	:global(.maplibregl-ctrl.maplibregl-ctrl-attrib) {
		display: none !important;
	}

	/* TODO:マップの調整 */
	.css-map {
		filter: saturate(80%);
	}
</style>
