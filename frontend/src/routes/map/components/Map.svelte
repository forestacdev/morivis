<script lang="ts">
	import { debounce } from 'es-toolkit';
	import type { FeatureCollection } from 'geojson';
	import {
		type StyleSpecification,
		type SourceSpecification,
		type BackgroundLayerSpecification,
		type LayerSpecification,
		type MapGeoJSONFeature,
		type MapMouseEvent,
		type LngLat
	} from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';

	import DropContainer from './DropContainer.svelte';
	import type {
		ResultData,
		SearchGeojsonData,
		ResultPoiData,
		ResultAddressData
	} from '../utils/feature';
	import { threeJsManager } from '../utils/threejs';

	import { MAP_FONT_DATA_PATH, MAP_SPRITE_DATA_PATH } from '$routes/constants';
	import { DEFAULT_SYMBOL_TEXT_FONT } from '$routes/constants';
	import LayerControl from '$routes/map/components/LayerControl.svelte';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import Compass from '$routes/map/components/map_control/Compass.svelte';
	import StreetViewLayer from '$routes/map/components/map_layer/StreetViewLayer.svelte';
	// import WebGLCanvasLayer from '$routes/map/components/map-layer/WebGLCanvasLayer.svelte';
	import AngleMarker from '$routes/map/components/marker/AngleMarker.svelte';
	import SearchMarker from '$routes/map/components/marker/SearchMarker.svelte';
	import SelectionMarker from '$routes/map/components/marker/SelectionMarker.svelte';
	import MobileMapControl from '$routes/map/components/mobile/MapControl.svelte';
	import MouseManager from '$routes/map/components/MouseManager.svelte';
	import PoiManager from '$routes/map/components/PoiManager.svelte';
	import SelectionPopup from '$routes/map/components/popup/SelectionPopup.svelte';
	import Tooltip from '$routes/map/components/popup/Tooltip.svelte';
	import FileManager from '$routes/map/components/upload/FileManager.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { AnyModelTiles3DEntry } from '$routes/map/data/types/model';
	import type { ModelMeshEntry, MeshStyle } from '$routes/map/data/types/model';
	import {
		type FeatureMenuData,
		type ClickedLayerFeaturesData,
		type DialogType
	} from '$routes/map/types';
	import type { DrawGeojsonData } from '$routes/map/types/draw';
	import type { StreetViewPointGeoJson } from '$routes/map/types/street-view';
	import type { ContextMenuState } from '$routes/map/types/ui';
	import { createDeckOverlay } from '$routes/map/utils/deckgl';
	import { createLayersItems } from '$routes/map/utils/layers';
	import type { EpsgCode } from '$routes/map/utils/proj/dict';
	import { createSourcesItems } from '$routes/map/utils/sources';
	import { isStreetView } from '$routes/stores';
	import { mapMode } from '$routes/stores';
	import {
		selectedBaseMap,
		showLabelLayer,
		showStreetViewLayer,
		showXYZTileLayer,
		showRoadLayer,
		type BaseMapType,
		showBoundaryLayer,
		showPoiLayer
	} from '$routes/stores/layers';
	import { isTerrain3d, mapStore } from '$routes/stores/map';

	interface Props {
		maplibreMap: maplibregl.Map | null; // MapLibre GL JSのマップインスタンス
		layerEntries: GeoDataEntry[];
		tempLayerEntries: GeoDataEntry[];
		streetViewLineData: FeatureCollection;
		streetViewPointData: StreetViewPointGeoJson;
		drawGeojsonData: DrawGeojsonData;
		showMapCanvas: boolean;
		featureMenuData: FeatureMenuData | null;
		showSelectionMarker: boolean;
		selectionMarkerLngLat: LngLat | null;
		showAngleMarker: boolean;
		angleMarkerLngLat: LngLat;
		cameraBearing: number; // カメラの向き
		showDataEntry: GeoDataEntry | null;
		dropFile: File | FileList | null;
		showDialogType: DialogType;
		showZoneForm: boolean; // 座標系選択ダイアログの表示状態
		focusBbox: [number, number, number, number] | null; // フォーカスするバウンディングボックス
		selectedEpsgCode: EpsgCode; // 選択されたEPSGコード
		isExternalCameraUpdate: boolean; // 外部からのカメラ更新かどうか
		searchGeojsonData: SearchGeojsonData | null;
		selectedSearchResultData: ResultData | null;
		selectedSearchId: number | null;
		searchResults: ResultData[] | null;
		contextMenuState: ContextMenuState | null;
		isDragover: boolean;
		focusFeature: (result: ResultData) => void;
	}

	let {
		maplibreMap = $bindable(),
		layerEntries = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(),
		featureMenuData = $bindable(),
		streetViewLineData,
		streetViewPointData,
		showMapCanvas,
		showSelectionMarker = $bindable(),
		showAngleMarker = $bindable(),
		selectionMarkerLngLat = $bindable(),
		angleMarkerLngLat = $bindable(),
		cameraBearing = $bindable(),
		dropFile = $bindable(),
		showDialogType = $bindable(),
		drawGeojsonData = $bindable(),
		showZoneForm = $bindable(),
		focusBbox = $bindable(),
		selectedEpsgCode,
		isExternalCameraUpdate = $bindable(),
		selectedSearchResultData = $bindable(),
		searchGeojsonData,
		selectedSearchId = $bindable(),
		searchResults,
		contextMenuState = $bindable(),
		isDragover = $bindable(),
		focusFeature
	}: Props = $props();

	// 監視用のデータを保持
	let layerWatchTargets = $derived.by(() => {
		return layerEntries.map((entry) => {
			return {
				id: entry.id,
				style: entry.style
			};
		});
	});

	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	let clickedLayerIds = $state<string[]>([]); // 選択ポップアップ
	let clickedLngLat = $state<LngLat | null>(null); // 選択ポップアップ

	let showTooltip = $state<boolean>(false); // ツールチップの表示
	let tooltipLngLat = $state<LngLat | null>(null); // ツールチップの位置
	let tooltipFeature = $state<MapGeoJSONFeature | null>(null); // ツールチップのフィーチャー

	let clickedLayerFeaturesData = $state<ClickedLayerFeaturesData[] | null>([]); // 選択ポップアップ ハイライト

	const bbox = [136.91278, 35.543576, 136.92986, 35.556704];
	// let webGLCanvasSource = $state<CanvasSourceSpecification>({
	// 	type: 'canvas',
	// 	canvas: 'canvas-layer',
	// 	coordinates: [
	// 		[bbox[0], bbox[3]],
	// 		[bbox[2], bbox[3]],
	// 		[bbox[2], bbox[1]],
	// 		[bbox[0], bbox[1]]
	// 	]
	// });
	// mapStyleの作成
	const createMapStyle = async (_dataEntries: GeoDataEntry[]): Promise<StyleSpecification> => {
		// ソースとレイヤーの作成
		const sources = !showDataEntry ? await createSourcesItems(_dataEntries) : {};
		const layers = !showDataEntry ? await createLayersItems(_dataEntries) : [];

		let previewSources = showDataEntry ? await createSourcesItems([showDataEntry], 'preview') : {};
		if (showDataEntry || showZoneForm) {
			previewSources = {
				...previewSources,
				preview_base_1: {
					type: 'raster',
					tiles: ['https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png'],
					tileSize: 256,
					minzoom: 0,
					maxzoom: 18,
					attribution: '地理院タイル'
				},
				preview_base_2: {
					type: 'vector',
					minzoom: 4,
					maxzoom: 16,
					url: 'pmtiles://https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/optimal_bvmap-v1.pmtiles',
					// tiles: ['https://cyberjapandata.gsi.go.jp/xyz/optimal_bvmap-v1/{z}/{x}/{y}.pbf'],
					attribution: '国土地理院最適化ベクトルタイル'
				},
				tile_grid: {
					type: 'raster',
					tiles: ['./tile_grid.png'],
					tileSize: 256
				}
			};
		}
		let previewLayers = showDataEntry ? await createLayersItems([showDataEntry], 'preview') : [];
		if (showDataEntry || showZoneForm) {
			previewLayers = [
				// {
				// 	id: 'background_layer',
				// 	type: 'background',
				// 	paint: {
				// 		'background-color': '#FFFFEE'
				// 	}
				// },
				{
					id: 'preview_base_layer_1',
					source: 'preview_base_1',
					type: 'raster',
					maxzoom: 24,
					paint: {
						'raster-opacity': 1.0,
						'raster-brightness-max': 0,
						'raster-brightness-min': 1.0
					}
				},
				{
					id: 'preview_base_layer_2',
					type: 'line',
					source: 'preview_base_2',
					'source-layer': 'Cntr',
					minzoom: 7,
					maxzoom: 24,
					layout: {
						'line-cap': 'round',
						'line-join': 'round'
					},
					paint: {
						'line-color': '#FFFFFF',
						'line-width': 1,
						'line-opacity': 0.6
					}
				},

				{
					id: '@overlay_layer',
					type: 'background',
					paint: {
						'background-color': '#000000',
						'background-opacity': showDataEntry || showZoneForm ? 0.6 : 0
					}
				} as BackgroundLayerSpecification,
				// {
				// 	id: 'tile_grid',
				// 	type: 'raster',
				// 	source: 'tile_grid',
				// 	paint: {
				// 		'raster-opacity': 0.3
				// 	}
				// },
				...previewLayers
			];
		}

		const xyzTileSources: Record<string, SourceSpecification> = $showXYZTileLayer
			? {
					tile_index: {
						type: 'vector',
						maxzoom: 22,
						tiles: ['tile_index://http://{z}/{x}/{y}.png?x={x}&y={y}&z={z}']
					}
				}
			: {};
		let xyzTileLayer: LayerSpecification[] = $showXYZTileLayer
			? [
					{
						id: '@tile_index_layer',
						type: 'fill',
						source: 'tile_index',
						'source-layer': 'geojsonLayer',
						maxzoom: 22,
						paint: {
							'fill-color': '#000000',
							'fill-opacity': 0
						}
					},
					{
						id: '@tile_index_line_layer',
						type: 'line',
						source: 'tile_index',
						'source-layer': 'geojsonLayer',
						paint: {
							'line-color': '#000000',
							'line-width': 2
						}
					},
					{
						id: 'tile_index_line_label',
						type: 'symbol',
						source: 'tile_index',
						'source-layer': 'geojsonLayer',
						paint: {
							'text-color': '#000000',
							'text-halo-color': '#FFFFFF',

							'text-halo-width': 1,
							'text-opacity': 1
						},
						layout: {
							'text-field': ['to-string', ['get', 'index']],
							'text-font': DEFAULT_SYMBOL_TEXT_FONT,
							'text-max-width': 12,
							'text-size': 24,
							'text-justify': 'auto'
						}
					}
				]
			: [];

		const terrain = {
			source: 'terrain',
			exaggeration: 1
		};

		// const terrainSources = await createTerrainSources(demEntries, 'dem_5a');

		const mapStyle: StyleSpecification = {
			version: 8,
			sprite: MAP_SPRITE_DATA_PATH,
			glyphs: MAP_FONT_DATA_PATH,
			//TODO: 投影法の切り替え対応
			// projection: {
			// 	type: checkPc() && zoom && zoom < 9 ? 'globe' : 'mercator'
			// },
			projection: {
				type: 'mercator'
			},
			sources: {
				terrain: {
					type: 'raster-dem',
					tiles: [
						'terrain://https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png?entryId=dem_land&formatType=image&demType=gsi&x={x}&y={y}&z={z}'
					],
					maxzoom: 15,
					minzoom: 1,
					tileSize: 256,
					attribution: '国土地理院'
				},
				street_view_node_sources: {
					type: 'geojson',
					data: streetViewPointData
				},
				street_view_link_sources: {
					type: 'geojson',
					data: streetViewLineData
				},
				...xyzTileSources,
				...sources,
				draw_source: {
					type: 'geojson',
					data: drawGeojsonData as FeatureCollection,
					promoteId: 'id'
				} as SourceSpecification,
				// prefecture: {
				// 	type: 'vector',
				// 	url: 'pmtiles://./prefecture.pmtiles',
				// 	maxzoom: 14
				// },

				...previewSources,
				zone_bbox: {
					type: 'geojson',
					data: { type: 'FeatureCollection', features: [] }
				},
				search_result: {
					type: 'geojson',
					data: searchGeojsonData || {
						type: 'FeatureCollection',
						features: []
					}
				}

				// webgl_canvas: webGLCanvasSource
			},
			layers: [
				{
					id: '@background_layer',
					type: 'background',
					paint: {
						'background-opacity': 1,
						'background-color': '#000'
					}
				},
				...layers,
				...xyzTileLayer,
				...previewLayers,
				{
					id: 'deck-reference-layer',
					type: 'background',
					paint: {
						'background-opacity': 0
					}
				},
				{
					id: '@zone_bbox_select',
					type: 'fill',
					source: 'zone_bbox',
					filter: [
						'all',
						['==', '$type', 'Polygon'],
						['==', 'code', selectedEpsgCode] // 最もシンプルで確実な方法
					],
					paint: {
						'fill-color': 'red',
						'fill-opacity': 0.5
					}
				},
				{
					id: '@zone_bbox',
					type: 'line',
					source: 'zone_bbox',
					filter: ['==', '$type', 'Polygon'],
					paint: {
						'line-color': 'white',
						'line-width': 1
					}
				},

				// 検索マーカー
				{
					id: '@search_result',
					type: 'symbol',
					source: 'search_result',
					layout: {
						'text-allow-overlap': true, // テキストの重複を許可
						'text-ignore-placement': true, // 他の要素への配置影響を無視
						'icon-allow-overlap': true, // アイコンの重複を許可
						'icon-ignore-placement': true,
						'icon-image': 'marker_png',
						'icon-anchor': 'bottom'
					}
				},
				// 検索ラベル
				{
					id: '@search_result_label',
					type: 'symbol',
					source: 'search_result',
					paint: {
						'text-color': '#000000',
						'text-halo-color': '#e8e8e8',
						'text-halo-width': 2
					},

					layout: {
						'text-field': '{name}',
						'text-size': 11,
						'text-max-width': 10,
						'text-font': DEFAULT_SYMBOL_TEXT_FONT,
						'text-variable-anchor': ['bottom-left', 'bottom-right'],
						'text-radial-offset': 2,
						'text-justify': 'auto'
					}
				}
				// {
				// 	id: '@nowcast_data_layer',
				// 	type: 'raster',
				// 	source: 'nowcast_data',
				// 	maxzoom: 22,
				// 	minzoom: 4,
				// 	paint: {
				// 		'raster-opacity': 0.7,
				// 		'raster-resampling': 'nearest',
				// 		'raster-fade-duration': 0
				// 	}
				// }

				// TODO: 描画レイヤー
				// ...drawLayers
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
				// ...drawLayers

				// {
				// 	id: '@webgl_canvas_layer',
				// 	type: 'raster',
				// 	source: 'webgl_canvas'
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

		if (!import.meta.env.PROD) {
			console.log('debug:mapStyle', mapStyle);
		}

		return mapStyle;
	};

	// 初期描画時
	onMount(async () => {
		if (!mapContainer) return;

		mapStore.init(mapContainer);
	});

	onDestroy(() => {
		if (maplibreMap) {
			maplibreMap.remove();
			maplibreMap = null;
		}
	});

	// マップのスタイルの更新
	const setStyleDebounce = debounce(async (entries: GeoDataEntry[]) => {
		const mapLibreEntry = entries.filter((entry) => entry.type !== 'model');

		const mapStyle = await createMapStyle(mapLibreEntry as GeoDataEntry[]);

		mapStore.setStyle(mapStyle);

		const tiles3dEntry = entries.filter(
			(entry) => entry.type === 'model' && entry.format.type === '3d-tiles'
		) as AnyModelTiles3DEntry[];

		const deckOverlayLayers = await createDeckOverlay(tiles3dEntry);
		mapStore.setDeckOverlay(deckOverlayLayers);

		const meshEntries = entries.filter(
			(entry) => entry.type === 'model' && entry.format.type === 'gltf'
		) as ModelMeshEntry<MeshStyle>[];

		const previewMeshEntry =
			showDataEntry && showDataEntry.type === 'model' && showDataEntry.style.type === 'mesh'
				? (showDataEntry as ModelMeshEntry<MeshStyle>)
				: null;

		if (previewMeshEntry) {
			mapStore.setThreeLayer([previewMeshEntry], 'preview');
		} else {
			mapStore.setThreeLayer(meshEntries, 'main');
		}

		mapStore.terrainReload();

		if (!maplibreMap) return;
	}, 100);

	// レイヤーの更新を監視
	$effect(() => {
		$state.snapshot(layerWatchTargets);
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	selectedBaseMap.subscribe((_baseMap: BaseMapType) => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});
	showPoiLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});
	showBoundaryLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});
	showLabelLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});
	showRoadLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});
	showXYZTileLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});
	// ストリートビューの表示
	showStreetViewLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	mapStore.onTerrain(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	// 検索結果の更新
	$effect(() => {
		if (searchGeojsonData || !searchGeojsonData) {
			setStyleDebounce(layerEntries as GeoDataEntry[]);
		}
	});

	// データプレビュー
	$effect(() => {
		if (showDataEntry || !showDataEntry) {
			setStyleDebounce(layerEntries as GeoDataEntry[]);
			threeJsManager.setGroupVisibility(!showDataEntry);
		}
	});

	// 座標系選択
	$effect(() => {
		if (showZoneForm) {
			setStyleDebounce(layerEntries as GeoDataEntry[]);
		} else {
			// 座標系選択ダイアログが閉じられた場合、レイヤーのスタイルを更新
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
			showSelectionMarker = false;
			selectedSearchId = null;
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
	const onDropFile: (files: FileList) => void = async (files) => {
		dropFile = files;
	};
</script>

<DropContainer
	bind:isDragover
	onDragover={dragover}
	onDragleave={dragleave}
	{onDropFile}
	class="h-full w-full"
>
	<div
		role="region"
		class="bg-main flex items-center justify-center overflow-hidden {$isStreetView &&
		$mapMode === 'small'
			? 'absolute transform border border-gray-300 max-lg:bottom-0 max-lg:h-1/2 max-lg:w-full lg:bottom-2 lg:left-2 lg:z-20 lg:h-[200px] lg:w-[300px] lg:rounded-lg'
			: 'relative h-full w-full grow'}"
	>
		<div
			bind:this={mapContainer}
			class="h-full w-full overflow-hidden bg-black transition-opacity lg:rounded-lg {!showMapCanvas &&
			$mapMode === 'view'
				? 'opacity-0'
				: $isStreetView && $mapMode === 'small'
					? ''
					: 'opacity-100'}"
		>
			{#if maplibreMap}
				<PoiManager
					map={maplibreMap}
					bind:featureMenuData
					{showDataEntry}
					{showZoneForm}
					bind:showSelectionMarker
				/>
			{/if}
		</div>

		{#if !$isStreetView && !showDataEntry}
			<!-- PC用地図コントロール -->
			<div class="absolute right-5 bottom-[100px] max-lg:hidden">
				<Compass />
			</div>

			<!-- PC用ベースマップコントロール -->
			<LayerControl />

			<!-- スマホ用地図コントロール -->
			<MobileMapControl />
		{/if}
		<SelectionPopup
			bind:clickedLayerIds
			bind:featureMenuData
			bind:clickedLayerFeaturesData
			{layerEntries}
			{clickedLngLat}
		/>
	</div>
</DropContainer>
<!-- <ThreeLayer /> -->

{#if maplibreMap}
	<FileManager
		map={maplibreMap}
		bind:isDragover
		bind:dropFile
		bind:tempLayerEntries
		bind:showDataEntry
		bind:showDialogType
		bind:showZoneForm
		bind:focusBbox
	/>

	<StreetViewLayer map={maplibreMap} />

	<!-- <WebGLCanvasLayer map={maplibreMap} canvasSource={webGLCanvasSource} /> -->
	<MouseManager
		{showDataEntry}
		bind:markerLngLat={selectionMarkerLngLat}
		bind:featureMenuData
		bind:showMarker={showSelectionMarker}
		bind:clickedLayerIds
		bind:cameraBearing
		bind:isExternalCameraUpdate
		bind:contextMenuState
		{searchResults}
		{streetViewPointData}
		{layerEntries}
		{toggleTooltip}
		{focusFeature}
	/>
	{#key selectionMarkerLngLat}
		<SelectionMarker
			map={maplibreMap}
			bind:show={showSelectionMarker}
			bind:lngLat={selectionMarkerLngLat}
		/>
	{/key}

	{#if selectedSearchResultData && selectedSearchId}
		<SearchMarker
			map={maplibreMap}
			bind:selectedSearchId
			prop={selectedSearchResultData as ResultPoiData | ResultAddressData}
		/>
	{/if}

	<AngleMarker
		map={maplibreMap}
		bind:show={showAngleMarker}
		bind:lngLat={angleMarkerLngLat}
		bind:rotation={cameraBearing}
	/>

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
	@media (width >= 64rem /* 1024px */) {
		:global(.maplibregl-canvas) {
			border-radius: 0.5rem !important;
			overflow: hidden !important;
		}
	}
</style>
