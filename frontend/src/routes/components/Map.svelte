<script lang="ts">
	// import turfDissolve from '@turf/dissolve';
	import turfBbox from '@turf/bbox';
	import turfBboxPolygon from '@turf/bbox-polygon';
	import { debounce } from 'es-toolkit';
	import { delay } from 'es-toolkit';
	import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, GeoJSON } from 'geojson';
	import type {
		StyleSpecification,
		MapGeoJSONFeature,
		SourceSpecification,
		CanvasSourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		BackgroundLayerSpecification,
		GeoJSONSourceSpecification,
		Marker,
		LngLat,
		Popup
	} from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import { onMount, mount } from 'svelte';

	import HeaderMenu from '$routes/components/header/_Index.svelte';
	import MapControl from '$routes/components/mapControl/_Index.svelte';
	import StreetViewLayer from '$routes/components/mapLayer/StreetViewLayer.svelte';
	import {
		streetViewCircleLayer,
		streetViewLineLayer,
		streetViewSources
	} from '$routes/components/mapLayer/StreetViewLayer.svelte';
	import SelectionMarker from '$routes/components/marker/SelectionMarker.svelte';
	import MouseManager from '$routes/components/MouseManager.svelte';
	import LegendPopup from '$routes/components/popup/LegendPopup.svelte';
	import SelectionPopup from '$routes/components/popup/SelectionPopup.svelte';
	import SidePopup from '$routes/components/popup/SidePopup.svelte';
	import TablePopup from '$routes/components/popup/TablePopup.svelte';
	import { MAPLIBRE_POPUP_OPTIONS, MAP_POSITION, type MapPosition } from '$routes/constants';
	import { geoDataEntry } from '$routes/data';
	import { getLocationBbox } from '$routes/data/locationBbox';
	import type { GeoDataEntry } from '$routes/data/types';
	import type { ZoomLevel, CategoryLegend, GradientLegend } from '$routes/data/types/raster';
	import { createHighlightLayer, createLayersItems } from '$routes/layers';
	import { createSourcesItems } from '$routes/sources';
	import {
		addedLayerIds,
		selectedLayerId,
		clickableVectorIds,
		clickableRasterIds,
		DEBUG_MODE,
		selectedHighlightData,
		isStreetView
	} from '$routes/store';
	import { mapMode, isEdit } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import { GeojsonCache } from '$routes/utils/geojson';
	import {
		mapGeoJSONFeatureToSidePopupData,
		type SidePopupData,
		type ClickedLayerFeaturesData
	} from '$routes/utils/geojson';
	import { getPixelColor, getGuide } from '$routes/utils/raster';

	interface Props {
		layerEntries: GeoDataEntry[];
		tempLayerEntries: GeoDataEntry[];
		streetViewLineData: FeatureCollection;
		streetViewPointData: FeatureCollection;
		angleMarker: Marker | null;
		streetViewPoint: any;
		showMapCanvas: boolean;
	}

	let {
		layerEntries = $bindable(),
		tempLayerEntries = $bindable(),
		streetViewLineData,
		streetViewPointData,
		angleMarker,
		streetViewPoint,
		showMapCanvas
	}: Props = $props();

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol, {
		tileUrl: 'https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png'
	});
	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ
	let maplibreMap = $state<maplibregl.Map | null>(null); // Maplibreのインスタンス

	let maplibrePopup = $state<Popup | null>(null); // ポップアップ
	let maplibreMarker = $state<Marker | null>(null); // マーカー
	let clickedLayerIds = $state<string[]>([]); // 選択ポップアップ
	let clickedLngLat = $state<LngLat | null>(null); // 選択ポップアップ
	let showMarker = $state<boolean>(false); // マーカーの表示
	let markerLngLat = $state<LngLat | null>(null); // マーカーの位置

	let clickedLayerFeaturesData = $state<ClickedLayerFeaturesData[] | null>([]); // 選択ポップアップ ハイライト
	let sidePopupData = $state<SidePopupData | null>(null);
	let inputSearchWord = $state<string>(''); // 検索ワード

	let selectedFocusSources = $state<GeoJSONSourceSpecification>({
		type: 'geojson',
		data: {
			type: 'FeatureCollection',
			features: []
		}
	});

	$effect(() => {
		if (selectedFocusSources) {
			const map = mapStore.getMap();
			if (!map) return;
			const source = map.getSource('selected_focus_sources') as maplibregl.GeoJSONSource;
			if (source) {
				source.setData(selectedFocusSources.data);
			}
		}
	});

	// mapStyleの作成
	const createMapStyle = async (_dataEntries: GeoDataEntry[]): Promise<StyleSpecification> => {
		// ソースとレイヤーの作成
		const sources = await createSourcesItems(_dataEntries);
		let layers = await createLayersItems(_dataEntries);

		const terrain = mapStore.getTerrain();

		const mapStyle = {
			version: 8,
			glyphs: './font/{fontstack}/{range}.pbf', // TODO; フォントの検討
			sources: {
				terrain: gsiTerrainSource,
				...streetViewSources,
				selected_focus_sources: {
					...selectedFocusSources
				},
				...sources
			},
			layers: [
				...layers,
				{
					id: '@overlay_layer',
					type: 'background',
					paint: {
						'background-color': '#000000',
						'background-opacity': 0
					}
				},
				streetViewLineLayer,
				streetViewCircleLayer
			],
			sky: {
				'sky-color': '#2baeff',
				'sky-horizon-blend': 0.5,
				'horizon-color': '#ffffff',
				'horizon-fog-blend': 0.5,
				'fog-color': '#2222ff',
				'fog-ground-blend': 0.5,
				'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0]
			},
			terrain: terrain ? terrain : undefined
		};

		// NOTE:debug

		return mapStyle as StyleSpecification;
	};

	// レイヤーの追加
	addedLayerIds.subscribe((ids) => {
		const filteredDataEntry = [...layerEntries, ...tempLayerEntries].filter((entry) =>
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

	// マップのスタイルの更新
	const setStyleDebounce = debounce(async (entries: GeoDataEntry[]) => {
		const mapStyle = await createMapStyle(entries as GeoDataEntry[]);
		mapStore.setStyle(mapStyle);
	}, 100);

	$effect(() => {
		const currentEntries = $state.snapshot(layerEntries);
		setStyleDebounce(currentEntries as GeoDataEntry[]);
	});

	$effect(() => {
		if (!sidePopupData) {
			// maplibreMarker?.remove();
			showMarker = false;
		}
	});

	// $effect(() => {
	// 	if (streetViewLineData) {
	// 		const map = mapStore.getMap();
	// 		if (!map) return;
	// 		const source = map.getSource('street_view_line') as maplibregl.GeoJSONSource;
	// 		if (source) {
	// 			source.setData(streetViewLineData);
	// 		}
	// 	}
	// });

	// $effect(() => {
	// 	$state.snapshot(streetViewPointData);
	// 	const map = mapStore.getMap();
	// 	if (!map) return;
	// 	const source = map.getSource('street_view_point') as maplibregl.GeoJSONSource;
	// 	console.log(map.getStyle());
	// 	console.log('source', source);
	// 	console.log('streetViewPointData', streetViewPointData);
	// 	if (source) {
	// 		source.setData(streetViewPointData);
	// 	}
	// });
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

	const removehighlightLayer = () => {
		const map = mapStore.getMap();
		if (!map) return;
		const layerIds = map.getLayersOrder();

		// _highlight_ で始まるレイヤーを削除
		layerIds.forEach((id) => {
			if (id.startsWith('@highlight_')) {
				map.removeLayer(id);
			}
		});
	};

	const toggleOverlayLayer = (val: boolean) => {
		const map = mapStore.getMap();
		if (!map) return;
	};

	$effect(() => {
		if (clickedLayerFeaturesData) {
			const map = mapStore.getMap();
			if (!map) return;

			clickedLayerFeaturesData.forEach(({ layerEntry, feature, featureId }) => {
				const highlightLayer = createHighlightLayer({ layerEntry, featureId });

				if (highlightLayer) {
					map.addLayer(highlightLayer);
				}
			});
		} else {
			removehighlightLayer();
		}
	});

	mapMode.subscribe((mode) => {
		console.log('mapMode', mode);
	});

	mapStore.onSetStyle((e) => {});
	mapStore.onInitialized((map) => {
		maplibreMap = map;
	});
</script>

<div class="relative h-full w-full">
	<HeaderMenu bind:sidePopupData {layerEntries} bind:inputSearchWord />

	<div
		bind:this={mapContainer}
		class="c-map-satellite absolute flex-grow transition-opacity duration-500 {!showMapCanvas &&
		$mapMode === 'view'
			? 'pointer-events-none bottom-0 left-0 h-full w-full opacity-0'
			: $isStreetView && $mapMode === 'small'
				? 'bottom-2 left-2 z-20 h-[200px] w-[300px] overflow-hidden rounded-md border-4 border-white bg-white'
				: 'bottom-0 left-0 h-full w-full opacity-100'}"
	></div>
	<MapControl />
	<SelectionPopup
		bind:clickedLayerIds
		bind:sidePopupData
		bind:clickedLayerFeaturesData
		{layerEntries}
		{clickedLngLat}
	/>
	<SidePopup bind:sidePopupData {layerEntries} />
</div>

{#if maplibreMap}
	<StreetViewLayer map={maplibreMap} />
	<MouseManager
		map={maplibreMap}
		bind:markerLngLat
		bind:sidePopupData
		bind:showMarker
		bind:clickedLayerIds
		{layerEntries}
	/>
	{#key markerLngLat}
		<SelectionMarker map={maplibreMap} bind:show={showMarker} bind:lngLat={markerLngLat} />
	{/key}
{/if}

<style>
	/* maplibreのデフォルトの出典表記を非表示 */
	:global(.maplibregl-ctrl.maplibregl-ctrl-attrib) {
		display: none !important;
	}

	/* TODO:マップの調整 */
	.c-map-satellite {
		filter: saturate(80%);
	}
</style>
