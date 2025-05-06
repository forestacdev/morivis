<script lang="ts">
	import { debounce } from 'es-toolkit';
	import type { FeatureCollection } from 'geojson';
	import {
		type StyleSpecification,
		type MapGeoJSONFeature,
		type CanvasSourceSpecification,
		type CanvasSource,
		type GeoJSONSourceSpecification,
		type MapMouseEvent,
		type Marker,
		type LngLat,
		Popup
	} from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount, mount } from 'svelte';

	import LockOnScreen from '$routes/components/effect/LockOnScreen.svelte';
	import FileManager from '$routes/components/FileManager.svelte';
	import MapControl from '$routes/components/map-control/_Index.svelte';
	import MapStatePane from '$routes/components/map-control/MapStatePane.svelte';
	import StreetViewLayer from '$routes/components/map-layer/StreetViewLayer.svelte';
	import {
		streetViewCircleLayer,
		streetViewLineLayer,
		streetViewSources
	} from '$routes/components/map-layer/StreetViewLayer.svelte';
	// import WebGLCanvasLayer from '$routes/components/map-layer/WebGLCanvasLayer.svelte';
	import SelectionMarker from '$routes/components/marker/SelectionMarker.svelte';
	import MouseManager from '$routes/components/MouseManager.svelte';
	import LegendPopup from '$routes/components/popup/LegendPopup.svelte';
	import SelectionPopup from '$routes/components/popup/SelectionPopup.svelte';
	import TablePopup from '$routes/components/popup/TablePopup.svelte';
	import Tooltip from '$routes/components/popup/Tooltip.svelte';
	import { MAP_FONT_DATA_PATH } from '$routes/constants';
	import { MAPLIBRE_POPUP_OPTIONS, MAP_POSITION, type MapPosition } from '$routes/constants';
	import { BASE_PATH } from '$routes/constants';
	import { demEntry } from '$routes/data/dem';
	import type { GeoDataEntry } from '$routes/data/types';
	import type { ZoomLevel, CategoryLegend, GradientLegend } from '$routes/data/types/raster';
	import { clickableRasterIds, isStreetView } from '$routes/store';
	import { mapMode, isTerrain3d } from '$routes/store';
	import { showLabelLayer } from '$routes/store/layers';
	import { orderedLayerIds } from '$routes/store/layers';
	import { mapStore } from '$routes/store/map';
	import { type FeatureMenuData, type ClickedLayerFeaturesData } from '$routes/utils/geojson';
	import { createHighlightLayer, createLayersItems } from '$routes/utils/layers';
	import { getPixelColor, getGuide } from '$routes/utils/raster';
	import { createSourcesItems } from '$routes/utils/sources';

	interface Props {
		layerEntries: GeoDataEntry[];
		tempLayerEntries: GeoDataEntry[];
		streetViewLineData: FeatureCollection;
		streetViewPointData: FeatureCollection;
		angleMarker: Marker | null;
		streetViewPoint: any;
		showMapCanvas: boolean;
		featureMenuData: FeatureMenuData | null;
		showSelectionMarker: boolean;
		selectionMarkerLngLat: LngLat | null;
		showDataEntry: GeoDataEntry | null;
	}

	let {
		layerEntries = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(),
		featureMenuData = $bindable(),
		streetViewLineData,
		streetViewPointData,
		angleMarker,
		streetViewPoint,
		showMapCanvas,
		showSelectionMarker = $bindable(),
		selectionMarkerLngLat = $bindable()
	}: Props = $props();

	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ
	let maplibreMap = $state<maplibregl.Map | null>(null); // Maplibreのインスタンス

	let maplibrePopup = $state<Popup | null>(null); // ポップアップ
	let clickedLayerIds = $state<string[]>([]); // 選択ポップアップ
	let clickedLngLat = $state<LngLat | null>(null); // 選択ポップアップ

	let showTooltip = $state<boolean>(false); // ツールチップの表示
	let tooltipLngLat = $state<LngLat | null>(null); // ツールチップの位置
	let tooltipFeature = $state<MapGeoJSONFeature | null>(null); // ツールチップのフィーチャー
	let isDragover = $state(false);
	let dropFile = $state<File | null>(null); // ドロップしたファイル

	let clickedLayerFeaturesData = $state<ClickedLayerFeaturesData[] | null>([]); // 選択ポップアップ ハイライト

	const bbox = [136.91278, 35.543576, 136.92986, 35.556704];
	let webGLCanvasSource = $state<CanvasSourceSpecification>({
		type: 'canvas',
		canvas: 'canvas-layer',
		coordinates: [
			[bbox[0], bbox[3]],
			[bbox[2], bbox[3]],
			[bbox[2], bbox[1]],
			[bbox[0], bbox[1]]
		]
	}); // WebGLキャンバスソース
	// mapStyleの作成
	const createMapStyle = async (_dataEntries: GeoDataEntry[]): Promise<StyleSpecification> => {
		// ソースとレイヤーの作成
		const sources = await createSourcesItems(_dataEntries);
		const layers = await createLayersItems(_dataEntries);

		let previewSources = showDataEntry ? await createSourcesItems([showDataEntry], 'preview') : {};
		if (showDataEntry) {
			previewSources = {
				...previewSources,
				tile_grid: {
					type: 'raster',
					tiles: ['/tile_grid.png'],
					tileSize: 256
				}
			};
		}
		let previewLayers = showDataEntry ? await createLayersItems([showDataEntry], 'preview') : [];
		if (showDataEntry) {
			previewLayers = [
				{
					id: 'tile_grid',
					type: 'raster',
					source: 'tile_grid',
					paint: {
						'raster-opacity': 0.5
					}
				},
				...previewLayers
			];
		}

		const terrain = {
			source: 'terrain',
			exaggeration: 1
		};

		const mapStyle: StyleSpecification = {
			version: 8,
			glyphs: MAP_FONT_DATA_PATH,
			sprite: 'https://gsi-cyberjapan.github.io/optimal_bvmap/sprite/std', // TODO: スプライトの保存
			sources: {
				terrain: {
					type: 'raster-dem',
					tiles: [`terrain://${demEntry.url}?x={x}&y={y}&z={z}`],
					tileSize: 256,
					minzoom: demEntry.sourceMinZoom,
					maxzoom: demEntry.sourceMaxZoom,
					attribution: demEntry.attribution,
					bounds: demEntry.bbox
				},
				...streetViewSources,
				...sources,
				tile_index: {
					type: 'vector',
					maxzoom: 22,

					tiles: ['tile_index://http://{z}/{x}/{y}.png?x={x}&y={y}&z={z}']
				},

				...previewSources
				// webgl_canvas: webGLCanvasSource
			},
			layers: [
				...layers,
				{
					id: '@overlay_layer',
					type: 'background',
					paint: {
						'background-color': '#000000',
						'background-opacity': showDataEntry ? 0.7 : 0
					}
				},
				...previewLayers,
				streetViewLineLayer,
				streetViewCircleLayer

				// {
				// 	id: '@webgl_canvas_layer',
				// 	type: 'raster',
				// 	source: 'webgl_canvas'
				// }
				// {
				// 	id: '@tile_index_layer',
				// 	type: 'fill',
				// 	source: 'tile_index',
				// 	'source-layer': 'geojsonLayer',
				// 	maxzoom: 22,
				// 	paint: {
				// 		'fill-color': '#000000',
				// 		'fill-opacity': 0.4
				// 	}
				// },
				// {
				// 	id: '@tile_index_line_layer',
				// 	type: 'line',
				// 	source: 'tile_index',
				// 	'source-layer': 'geojsonLayer',
				// 	paint: {
				// 		'line-color': '#000000',
				// 		'line-width': 2
				// 	}
				// },
				// {
				// 	id: 'tile_index_line_label',
				// 	type: 'symbol',
				// 	source: 'tile_index',
				// 	'source-layer': 'geojsonLayer',
				// 	paint: {
				// 		'text-color': '#000000',
				// 		'text-halo-color': '#FFFFFF',
				// 		'text-halo-width': 1,
				// 		'text-opacity': 1
				// 	},
				// 	layout: {
				// 		'text-field': ['to-string', ['get', 'z']],
				// 		'text-max-width': 12,
				// 		'text-size': 12,
				// 		'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
				// 		'text-radial-offset': 0.5,
				// 		'text-justify': 'auto'
				// 	}
				// },
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
			terrain: $isTerrain3d ? terrain : undefined
		};

		return mapStyle;
	};

	// レイヤーの追加
	orderedLayerIds.subscribe((ids) => {
		const filteredDataEntry = layerEntries.filter((entry) => ids.includes(entry.id));

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
		mapStore.terrainReload();
	}, 100);

	// レイヤーの更新を監視
	$effect(() => {
		const currentEntries = $state.snapshot(layerEntries);
		setStyleDebounce(currentEntries as GeoDataEntry[]);
	});

	$effect(() => {
		if (showDataEntry) {
			setStyleDebounce(layerEntries as GeoDataEntry[]);
		} else {
			setStyleDebounce(layerEntries as GeoDataEntry[]);
		}
	});

	// ラベルの表示
	showLabelLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	const toggleTooltip = (e?: MapMouseEvent, feature?: MapGeoJSONFeature) => {
		if (!maplibreMap) return;
		if (!e || !feature) {
			showTooltip = false;
			return;
		}
		if (e) {
			tooltipLngLat = e.lngLat;
			tooltipFeature = feature;
			showTooltip = true;
		}
	};

	$effect(() => {
		if (!featureMenuData) {
			// maplibreMarker?.remove();
			showSelectionMarker = false;
		}
	});

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

	mapStore.onInitialized((map) => {
		maplibreMap = map;
	});

	// ドラッグ中のイベント
	const dragover: (e: DragEvent) => void = (e) => {
		e.preventDefault();
		isDragover = true;
	};
	const dragleave: (e: DragEvent) => void = (e) => {
		e.preventDefault();
		isDragover = false;
	};
	// ドロップ完了時にファイルを取得
	const drop: (e: DragEvent) => void = async (e) => {
		e.preventDefault();
		isDragover = false;

		const dataTransfer = e.dataTransfer;
		if (!dataTransfer) return;

		const files = dataTransfer.files;
		if (!files || files.length === 0) return;
		const file = files[0]; // 最初のファイルを取得

		dropFile = file;
	};
</script>

<div
	role="region"
	ondrop={drop}
	ondragover={dragover}
	ondragleave={dragleave}
	class="relative h-full w-full"
>
	<div
		bind:this={mapContainer}
		class="c-map-satellite absolute grow bg-black transition-opacity duration-500 {!showMapCanvas &&
		$mapMode === 'view'
			? 'pointer-events-none bottom-0 left-0 h-full w-full opacity-0'
			: $isStreetView && $mapMode === 'small'
				? 'bottom-2 left-2 z-20 h-[200px] w-[300px] overflow-hidden rounded-md border-4 border-white bg-white'
				: 'bottom-0 left-0 h-full w-full opacity-100'}"
	></div>
	<MapControl />
	<MapStatePane />
	<SelectionPopup
		bind:clickedLayerIds
		bind:featureMenuData
		bind:clickedLayerFeaturesData
		{layerEntries}
		{clickedLngLat}
	/>
	<LockOnScreen />
</div>

{#if maplibreMap}
	<FileManager map={maplibreMap} bind:isDragover bind:dropFile bind:tempLayerEntries />

	<StreetViewLayer map={maplibreMap} />
	<!-- <WebGLCanvasLayer map={maplibreMap} canvasSource={webGLCanvasSource} /> -->
	<MouseManager
		map={maplibreMap}
		bind:markerLngLat={selectionMarkerLngLat}
		bind:featureMenuData
		bind:showMarker={showSelectionMarker}
		bind:clickedLayerIds
		{layerEntries}
		{toggleTooltip}
	/>
	{#key selectionMarkerLngLat}
		<SelectionMarker
			map={maplibreMap}
			bind:show={showSelectionMarker}
			bind:lngLat={selectionMarkerLngLat}
		/>
	{/key}

	{#key showTooltip}
		<Tooltip
			map={maplibreMap}
			bind:show={showTooltip}
			bind:lngLat={tooltipLngLat}
			feature={tooltipFeature}
		/>
	{/key}
{/if}

<style>
	/* maplibreのデフォルトの出典表記を非表示 */
	:global(.maplibregl-ctrl.maplibregl-ctrl-attrib) {
		display: none !important;
	}

	/* TODO:マップの調整 */
	.c-map-satellite {
		filter: saturate(100%);
	}
</style>
