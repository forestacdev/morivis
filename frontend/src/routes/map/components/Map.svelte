<script lang="ts">
	import { debounce } from 'es-toolkit';
	import type { FeatureCollection } from 'geojson';
	import {
		type StyleSpecification,
		type SourceSpecification,
		type BackgroundLayerSpecification,
		type LayerSpecification,
		type MapGeoJSONFeature,
		type CanvasSourceSpecification,
		type MapMouseEvent,
		type LngLat
	} from 'maplibre-gl';
	import maplibregl from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';

	import 'maplibre-gl/dist/maplibre-gl.css';

	import LockOnScreen from '$routes/map/components/effect/LockOnScreen.svelte';

	import MapControl from '$routes/map/components/map_control/MapControl.svelte';
	import StreetViewLayer from '$routes/map/components/map_layer/StreetViewLayer.svelte';

	// import WebGLCanvasLayer from '$routes/map/components/map-layer/WebGLCanvasLayer.svelte';
	import SelectionMarker from '$routes/map/components/marker/SelectionMarker.svelte';
	import AngleMarker from '$routes/map/components/marker/AngleMarker.svelte';
	import MouseManager from '$routes/map/components/MouseManager.svelte';
	import SelectionPopup from '$routes/map/components/popup/SelectionPopup.svelte';
	import Tooltip from '$routes/map/components/popup/Tooltip.svelte';
	import FileManager from '$routes/map/components/upload/FileManager.svelte';
	import Compass from '$routes/map/components/map_control/Compass.svelte';
	import { MAP_FONT_DATA_PATH, MAP_SPRITE_DATA_PATH } from '$routes/constants';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterEntry, RasterDemStyle } from '$routes/map/data/types/raster';

	import { DEBUG_MODE, isStreetView } from '$routes/stores';
	import { mapMode } from '$routes/stores';
	import {
		activeLayerIdsStore,
		getEntryIds,
		showLabelLayer,
		showStreetViewLayer,
		showXYZTileLayer
	} from '$routes/stores/layers';

	import { isTerrain3d, mapStore } from '$routes/stores/map';
	import type { DrawGeojsonData } from '$routes/map/types/draw';
	import {
		type FeatureMenuData,
		type ClickedLayerFeaturesData,
		type DialogType
	} from '$routes/map/types';
	import { createLayersItems } from '$routes/map/utils/layers';
	import { createSourcesItems, createTerrainSources } from '$routes/map/utils/sources';

	import PoiManager from '$routes/map/components/PoiManager.svelte';
	import type { StreetViewPoint } from '$routes/map/types/street-view';
	import { streetViewSources } from '$routes/map/components/map_layer';
	import type { EpsgCode } from '$routes/map/utils/proj/dict';

	interface Props {
		maplibreMap: maplibregl.Map | null; // MapLibre GL JSのマップインスタンス
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
		showZoneForm: boolean; // 座標系選択ダイアログの表示状態
		focusBbox: [number, number, number, number] | null; // フォーカスするバウンディングボックス
		selectedEpsgCode: EpsgCode; // 選択されたEPSGコード
		setPoint: (point: StreetViewPoint) => void; // ストリートビューのポイントを設定する関数
	}

	let {
		maplibreMap = $bindable(),
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
		showZoneForm = $bindable(),
		focusBbox = $bindable(),
		selectedEpsgCode,
		setPoint
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
		if (showDataEntry || showZoneForm) {
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
		if (showDataEntry || showZoneForm) {
			previewLayers = [
				{
					id: 'tile_grid',
					type: 'raster',
					source: 'tile_grid',
					paint: {
						'raster-opacity': 0.3
					}
				},
				...previewLayers
			];
		}

		let xyzTileSources = $showXYZTileLayer
			? {
					tile_index: {
						type: 'vector',
						maxzoom: 22,
						tiles: ['tile_index://http://{z}/{x}/{y}.png?x={x}&y={y}&z={z}']
					} as SourceSpecification
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

		const mapStyle: StyleSpecification = {
			version: 8,
			// sprite: 'https://gsi-cyberjapan.github.io/optimal_bvmap/sprite/std', // TODO: スプライトの保存
			sprite: MAP_SPRITE_DATA_PATH,
			glyphs: MAP_FONT_DATA_PATH,
			// glyphs: MAP_FONT_DATA_PATH,
			projection: {
				type: 'globe'
			},
			sources: {
				...terrainSources,
				...streetViewSources,
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
					data: { type: 'FeatureCollection', features: [] }
				}
				// webgl_canvas: webGLCanvasSource
			},
			layers: [
				...layers,
				...xyzTileLayer,
				{
					id: '@overlay_layer',
					type: 'background',
					paint: {
						'background-color': '#000000',
						'background-opacity': showDataEntry || showZoneForm ? 0.6 : 0
					}
				} as BackgroundLayerSpecification,
				...previewLayers,

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
				}

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

		if (import.meta.env.MODE === 'development') {
			console.log('mapStyle', mapStyle);
		}

		return mapStyle;
	};

	// 初期描画時
	onMount(async () => {
		if (!layerEntries) return;

		// TODO: レイヤーエントリーをローカルストレージまたはセッションストレージから読み込む
		// if (!$DEBUG_MODE) {
		// 	const localEntries = loadLayerEntries();

		// 	// セッションストレージからのレイヤーエントリーが存在する場合はそれを使用
		// 	if (localEntries && localEntries.length > 0) {
		// 		layerEntries = localEntries;
		// 		const ids = getEntryIds(layerEntries);
		// 		activeLayerIdsStore.setLayers(ids);
		// 	}
		// }

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

		// saveToLayerEntries(entries as GeoDataEntry[]);

		if (!maplibreMap) return;
	}, 100);

	// レイヤーの更新を監視
	$effect(() => {
		$state.snapshot(layerWatchTargets);
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	// ラベルの表示
	showLabelLayer.subscribe(() => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	showXYZTileLayer.subscribe(() => {
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
	class="bg-main flex items-center justify-center overflow-hidden {$isStreetView &&
	$mapMode === 'small'
		? 'absolute bottom-2 left-2 z-20 h-[200px] w-[300px] transform rounded-lg border-4 border-white hover:h-[400px] hover:w-[600px] hover:transition-all hover:duration-300'
		: 'relative h-full w-full grow pb-4 pr-4'}"
>
	<div
		bind:this={mapContainer}
		class="h-full w-full overflow-hidden rounded-lg bg-black transition-opacity {!showMapCanvas &&
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
	<!-- <FooterMenu {layerEntries} /> -->

	<!-- <WebGLScreen /> -->
	<!-- <ThreeScreen /> -->

	<MapControl />
	{#if !$isStreetView}
		<Compass />
	{/if}
	<!-- <MapStatePane /> -->
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

	:global(.maplibregl-canvas) {
		border-radius: 0.5rem !important;
		overflow: hidden !important;
	}
</style>
