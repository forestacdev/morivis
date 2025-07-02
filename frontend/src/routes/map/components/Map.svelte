<script lang="ts">
	import { debounce, delay } from 'es-toolkit';
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
		type AddLayerObject,
		format
	} from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';

	import 'maplibre-gl/dist/maplibre-gl.css';

	import LockOnScreen from '$routes/map/components/effect/LockOnScreen.svelte';
	import WebGLScreen from '$routes/map/components/effect/screen/WebGLScreen.svelte';
	import MapControl from '$routes/map/components/map_control/MapControl.svelte';
	import MapStatePane from '$routes/map/components/map_control/MapStatePane.svelte';
	import StreetViewLayer from '$routes/map/components/map_layer/StreetViewLayer.svelte';
	import { streetViewSources } from '$routes/map/components/map_layer/StreetViewLayer.svelte';
	// import WebGLCanvasLayer from '$routes/map/components/map-layer/WebGLCanvasLayer.svelte';
	import SelectionMarker from '$routes/map/components/marker/SelectionMarker.svelte';
	import AngleMarker from '$routes/map/components/marker/AngleMarker.svelte';
	import MouseManager from '$routes/map/components/MouseManager.svelte';
	import SelectionPopup from '$routes/map/components/popup/SelectionPopup.svelte';
	import Tooltip from '$routes/map/components/popup/Tooltip.svelte';
	import FileManager from '$routes/map/components/upload/FileManager.svelte';
	import { MAP_FONT_DATA_PATH } from '$routes/constants';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterEntry, RasterDemStyle } from '$routes/map/data/types/raster';
	import type { DialogType, StreetViewPoint } from '$routes/map/+page.svelte';
	import { DEBUG_MODE, isStreetView } from '$routes/stores';
	import { mapMode, isTerrain3d } from '$routes/stores';
	import {
		getLayersGroup,
		groupedLayerStore,
		showBoundaryLayer,
		showContourLayer,
		showLabelLayer,
		showLoadLayer,
		showStreetViewLayer
	} from '$routes/stores/layers';
	import { showHillshadeLayer } from '$routes/stores/layers';
	import { orderedLayerIds } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';
	import { isSideMenuType } from '$routes/stores/ui';
	import type { DrawGeojsonData } from '$routes/map/types/draw';
	import { type FeatureMenuData, type ClickedLayerFeaturesData } from '$routes/map/types';
	import { createLayersItems } from '$routes/map/utils/layers';
	import { createSourcesItems, createTerrainSources } from '$routes/map/utils/sources';
	import { drawLayers } from '$routes/map/utils/layers/draw';
	import { loadLayerEntries, saveToLayerEntries } from '$routes/map/utils/local_storage';
	import PoiManager from '$routes/map/components/PoiManager.svelte';

	interface Props {
		layerEntries: GeoDataEntry[];
		tempLayerEntries: GeoDataEntry[];
		streetViewLineData: FeatureCollection;
		streetViewPointData: FeatureCollection;
		drawGeojsonData: DrawGeojsonData;
		demEntries: RasterEntry<RasterDemStyle>[]; // DEMデータのエントリー
		streetViewPoint: any;
		showMapCanvas: boolean;
		featureMenuData: FeatureMenuData | null;
		showSelectionMarker: boolean;
		selectionMarkerLngLat: LngLat | null;
		showAngleMarker: boolean;
		angleMarkerLngLat: LngLat | null;
		cameraBearing: number; // カメラの向き
		showDataEntry: GeoDataEntry | null;
		dropFile: File | FileList | null;
		showDialogType: DialogType;
		setPoint: (point: StreetViewPoint) => void; // ストリートビューのポイントを設定する関数
	}

	let {
		layerEntries = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(),
		featureMenuData = $bindable(),
		streetViewLineData,
		streetViewPointData,
		streetViewPoint,
		showMapCanvas,
		showSelectionMarker = $bindable(),
		showAngleMarker = $bindable(),
		selectionMarkerLngLat = $bindable(),
		angleMarkerLngLat = $bindable(),
		cameraBearing = $bindable(),
		dropFile = $bindable(),
		showDialogType = $bindable(),
		drawGeojsonData = $bindable(),
		demEntries,
		setPoint
	}: Props = $props();

	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ
	let maplibreMap = $state<maplibregl.Map | null>(null); // Maplibreのインスタンス

	let clickedLayerIds = $state<string[]>([]); // 選択ポップアップ
	let clickedLngLat = $state<LngLat | null>(null); // 選択ポップアップ

	let showTooltip = $state<boolean>(false); // ツールチップの表示
	let tooltipLngLat = $state<LngLat | null>(null); // ツールチップの位置
	let tooltipFeature = $state<MapGeoJSONFeature | null>(null); // ツールチップのフィーチャー
	let isDragover = $state(false);

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

		const terrainSources = await createTerrainSources(demEntries, 'dem_10b');

		let previewSources = showDataEntry ? await createSourcesItems([showDataEntry], 'preview') : {};
		if (showDataEntry) {
			previewSources = {
				...previewSources,
				tile_grid: {
					type: 'raster',
					tiles: ['./tile_grid.png'],
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
			sprite: 'https://gsi-cyberjapan.github.io/optimal_bvmap/sprite/std', // TODO: スプライトの保存
			glyphs: 'https://tile.openstreetmap.jp/fonts/{fontstack}/{range}.pbf',
			// glyphs: MAP_FONT_DATA_PATH,
			projection: {
				type: 'globe'
			},
			sources: {
				...terrainSources,
				...streetViewSources,
				...sources,
				tile_index: {
					type: 'vector',
					maxzoom: 22,
					tiles: ['tile_index://http://{z}/{x}/{y}.png?x={x}&y={y}&z={z}']
				},
				draw_source: {
					type: 'geojson',
					data: drawGeojsonData as FeatureCollection,
					promoteId: 'id'
				},
				// prefecture: {
				// 	type: 'vector',
				// 	url: 'pmtiles://./prefecture.pmtiles',
				// 	maxzoom: 14
				// },

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
				...drawLayers

				// {
				// 	id: 'municipalities',
				// 	type: 'fill',
				// 	source: 'prefecture',
				// 	'source-layer': 'municipalities',

				// 	maxzoom: 22,
				// 	paint: {
				// 		'fill-color': '#ffffff',
				// 		'fill-opacity': 0.6
				// 	}
				// }

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
				// 		'text-field': ['to-string', ['get', 'index']],
				// 		'text-max-width': 12,
				// 		'text-font': ['Noto Sans JP Light'],
				// 		'text-size': 24,
				// 		'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
				// 		'text-radial-offset': 0.5,
				// 		'text-justify': 'auto'
				// 	}
				// }
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
			transition: { duration: 0, delay: 0 },
			terrain: $isTerrain3d ? terrain : undefined
		};

		console.log('mapStyle', mapStyle);

		return mapStyle;
	};

	// 初期描画時
	onMount(async () => {
		if (!layerEntries) return;

		if (!$DEBUG_MODE) {
			const localEntries = loadLayerEntries();

			// ローカルストレージからのレイヤーエントリーが存在する場合はそれを使用
			if (localEntries && localEntries.length > 0) {
				layerEntries = localEntries;
				const layersGroup = getLayersGroup(layerEntries);
				groupedLayerStore.setLayers(layersGroup);
			}
		}

		const mapStyle = await createMapStyle(layerEntries);
		if (!mapStyle || !mapContainer) return;

		mapStore.init(mapContainer, mapStyle as StyleSpecification);
	});

	onDestroy(() => {
		if (maplibreMap) {
			maplibreMap.remove();
			maplibreMap = null;
		}
	});

	// マップのスタイルの更新
	const setStyleDebounce = debounce(async (entries: GeoDataEntry[]) => {
		const mapStyle = await createMapStyle(entries as GeoDataEntry[]);
		mapStore.setStyle(mapStyle);
		mapStore.terrainReload();

		saveToLayerEntries(entries as GeoDataEntry[]);

		if (!maplibreMap) return;
	}, 100);

	// レイヤーの更新を監視
	$effect(() => {
		const currentEntries = $state.snapshot(layerEntries);
		setStyleDebounce(currentEntries as GeoDataEntry[]);
	});

	// ラベルの表示
	showLabelLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	// 道路の表示
	showLoadLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	// 行政境界の表示
	showBoundaryLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	// 等高線の表示
	showContourLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	// 陰影の表示
	showHillshadeLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	// ストリートビューの表示
	showStreetViewLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	// TODO:書き込みデータの更新を監視
	// $effect(() => {
	// 	if (!maplibreMap || !maplibreMap.loaded()) return;

	// 	const source = maplibreMap.getSource('draw_source') as GeoJSONSourceSpecification;
	// 	if (source) {
	// 		source.setData(drawGeojsonData as FeatureCollection);
	// 	}
	// });

	// データプレビュー
	$effect(() => {
		if (showDataEntry) {
			setStyleDebounce(layerEntries as GeoDataEntry[]);
		}
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

		dropFile = files;
	};
</script>

<div
	role="region"
	ondrop={drop}
	ondragover={dragover}
	ondragleave={dragleave}
	class="bg-main relative flex h-full w-full grow items-center justify-center {$isSideMenuType
		? 'overflow-hidden'
		: ''}"
>
	<div
		bind:this={mapContainer}
		class="absolute grow bg-black transition-opacity duration-500 {!showMapCanvas &&
		$mapMode === 'view'
			? 'pointer-events-none bottom-0 left-0 h-full w-full opacity-0'
			: $isStreetView && $mapMode === 'small'
				? 'bottom-2 left-2 z-20 h-[200px] w-[300px] overflow-hidden rounded-md border-4 border-white bg-white'
				: 'bottom-0 left-0 h-full w-full opacity-100'}"
	></div>

	<!-- <div
		bind:this={mapContainer}
		class="absolute h-full w-full bg-black transition-all duration-200"
	></div> -->

	<!-- <div
		bind:this={mapContainer}
		class="absolute bg-black transition-all duration-200 {$isSideMenuType
			? 'h-[calc(100%-100px)] w-[calc(100%-100px)] overflow-hidden rounded-lg'
			: 'h-full w-full'}"
	></div> -->
	<!-- <WebGLScreen /> -->
	<!-- <ThreeScreen /> -->

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
	<FileManager
		map={maplibreMap}
		bind:isDragover
		bind:dropFile
		bind:tempLayerEntries
		bind:showDataEntry
		bind:showDialogType
	/>

	<StreetViewLayer map={maplibreMap} />
	<PoiManager map={maplibreMap} bind:featureMenuData {showDataEntry} />
	<!-- <WebGLCanvasLayer map={maplibreMap} canvasSource={webGLCanvasSource} /> -->
	<MouseManager
		{showDataEntry}
		bind:markerLngLat={selectionMarkerLngLat}
		bind:featureMenuData
		bind:showMarker={showSelectionMarker}
		bind:clickedLayerIds
		{streetViewPointData}
		{setPoint}
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

	{#key angleMarkerLngLat}
		<AngleMarker
			map={maplibreMap}
			bind:show={showAngleMarker}
			bind:lngLat={angleMarkerLngLat}
			bind:rotation={cameraBearing}
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
</style>
