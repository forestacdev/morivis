<script lang="ts">
	import { debounce } from 'es-toolkit';
	import type { FeatureCollection } from 'geojson';
	import { onMount, onDestroy } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { Unsubscriber } from 'svelte/store';

	import DropContainer from './DropContainer.svelte';
	import type { ResultData, SearchGeojsonData } from '../utils/data/search-result';

	import 'maplibre-gl/dist/maplibre-gl.css';
	import HighlightMarkerManager from '$routes/map/components/HighlightMarkerManager.svelte';
	import Compass from '$routes/map/components/map_control/Compass.svelte';
	// import WebGLCanvasLayer from '$routes/map/components/map-layer/WebGLCanvasLayer.svelte';
	import AngleMarker from '$routes/map/components/marker/AngleMarker.svelte';
	import SelectionMarker from '$routes/map/components/marker/SelectionMarker.svelte';
	import MouseManager from '$routes/map/components/MouseManager.svelte';
	import SelectionPopup from '$routes/map/components/popup/SelectionPopup.svelte';
	import Tooltip from '$routes/map/components/popup/Tooltip.svelte';
	import FileManager from '$routes/map/components/upload/FileManager.svelte';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import type { GeoRefPreviewData } from '$routes/map/components/upload/form/transform/georef-types';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type {
		AnyTiles3DEntry,
		MeshEntry,
		MeshStyle,
		DeckVectorEntry,
		PointCloudEntry,
		ThreeModelEntry
	} from '$routes/map/data/types/model';
	import type {
		RasterBaseMapStyle,
		RasterCogEntry,
		RasterTiffStyle,
		RasterWcsEntry
	} from '$routes/map/data/types/raster';
	import {
		type FeatureMenuData,
		type ClickedLayerFeaturesData,
		type DialogType,
		type HighlightMarkerState,
		type UploadFiles
	} from '$routes/map/types';
	import type { DrawGeojsonData } from '$routes/map/types/draw';
	import type { StreetViewPointGeoJson } from '$routes/map/types/street-view';
	import type { ContextMenuState } from '$routes/map/types/ui';
	import { GeoTiffCache } from '$routes/map/utils/cache/raster/geotiff-cache';
	import {
		clearAllCogViewportImages,
		fetchCogViewportImage,
		markCogViewportReady,
		terminateCogViewportRuntime
	} from '$routes/map/utils/formats/geotiff/cog-runtime';
	import { CogTileManager } from '$routes/map/utils/formats/geotiff/cog_tile_manager';
	import { mcaGridPreviewStore } from '$routes/map/utils/formats/mca/placement-store';
	import { createMcaRegionGridController } from '$routes/map/utils/formats/mca/region-grid';
	import {
		fetchWcsViewportImage,
		clearAllWcsViewportImages,
		markWcsViewportReady,
		WcsViewportTooBroadError
	} from '$routes/map/utils/formats/wcs/runtime';
	import { createHighlightLayerItems } from '$routes/map/utils/layers/highlight-builder';
	import {
		loadReferenceStyle,
		selectReferenceStyle,
		type ReferenceStyle
	} from '$routes/map/utils/layers/reference-style';
	import maplibregl from '$routes/map/utils/maplibre';
	import type { LngLat, MapGeoJSONFeature, MapMouseEvent } from '$routes/map/utils/maplibre';
	import type { EpsgCode } from '$routes/map/utils/proj/dict';
	import { getLayerWatchStyleTarget } from '$routes/map/utils/raster/dimension-runtime';
	import { prepareSourceData } from '$routes/map/utils/sources/prepare';
	import { applyRasterVisualizationUpdates } from '$routes/map/utils/sources/raster-updates';
	import { createMapStyle, type MapStyleInput } from '$routes/map/utils/style/map-style';
	import { threeJsManager } from '$routes/map/utils/three/layer-manager';
	import { clickableVectorIds, clickableRasterIds } from '$routes/stores';
	import { isStreetView } from '$routes/stores';
	import { mapMode } from '$routes/stores';
	import { mapAttributions } from '$routes/stores/attributions';
	import { mapPaneScale } from '$routes/stores/effect';
	import {
		selectedBaseMap,
		showLabelLayer,
		showHillshadeLayer,
		showStreetViewLayer,
		showXYZTileLayer,
		showRegionalMeshLayer,
		showH3Layer,
		showPlaneGridLayer,
		showContourLayer,
		planeGridZone,
		showLineLayer,
		type BaseMapType,
		activeLayerIdsStore
	} from '$routes/stores/layers';
	import { isGlobe, isTerrain3d, mapStore } from '$routes/stores/map';
	import { showLayerAddedNotification, showNotification } from '$routes/stores/notification';
	import { showDataMenu, showModelView } from '$routes/stores/ui';

	interface Props {
		maplibreMap: maplibregl.Map | null; // MapLibre GL JSのマップインスタンス
		layerEntries: MorivisLayerEntry[];
		tempLayerEntries: MorivisLayerEntry[];
		streetViewLineData: FeatureCollection;
		streetViewPointData: StreetViewPointGeoJson;
		drawGeojsonData: DrawGeojsonData;
		showMapCanvas: boolean;
		featureMenuData: FeatureMenuData | null;
		highlightMarkerState: HighlightMarkerState | null;
		showSelectionMarker: boolean;
		selectionMarkerLngLat: LngLat | null;
		showAngleMarker: boolean;
		angleMarkerLngLat: LngLat;
		cameraBearing: number; // カメラの向き
		showDataEntry: MorivisLayerEntry | null;
		dropFile: UploadFiles;
		showDialogType: DialogType;
		transformOptionMode: TransformOptionMode;
		focusBbox: [number, number, number, number] | null; // フォーカスするバウンディングボックス
		selectedEpsgCode: EpsgCode; // 選択されたEPSGコード
		zoneBboxGeojsonData: FeatureCollection; // 座標系選択用GeoJSON
		isExternalCameraUpdate: boolean; // 外部からのカメラ更新かどうか
		searchGeojsonData: SearchGeojsonData | null;
		selectedSearchResultData: ResultData | null;
		selectedSearchId: number | null;
		searchResults: ResultData[] | null;
		contextMenuState: ContextMenuState | null;
		isDragover: boolean;
		geoRefPreviewData: GeoRefPreviewData | null;
		previewOpacity: number;
		focusFeature: (result: ResultData) => void;
	}

	let {
		maplibreMap = $bindable(),
		layerEntries = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(),
		featureMenuData = $bindable(),
		highlightMarkerState = $bindable(),
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
		transformOptionMode,
		focusBbox = $bindable(),
		selectedEpsgCode,
		zoneBboxGeojsonData,
		isExternalCameraUpdate = $bindable(),
		selectedSearchResultData = $bindable(),
		searchGeojsonData,
		selectedSearchId = $bindable(),
		searchResults,
		contextMenuState = $bindable(),
		isDragover = $bindable(),
		geoRefPreviewData,
		previewOpacity,
		focusFeature
	}: Props = $props();

	const isZoneRegistrationActive = $derived(transformOptionMode === 'zone');
	const isGeoRefRegistrationActive = $derived(transformOptionMode === 'georef');
	// 位置合わせは現在の地図に重ねる。通常プレビューと座標系選択だけを単独表示にする。
	const isIsolatedPreview = $derived(
		!isGeoRefRegistrationActive && (!!showDataEntry || isZoneRegistrationActive)
	);
	const isModelPlacementActive = $derived(
		transformOptionMode === 'georef' &&
			showDataEntry?.type === 'model' &&
			(showDataEntry.style.type === 'mesh' || showDataEntry.style.type === 'gaussian-splat')
	);
	const mcaRegionGridController = createMcaRegionGridController();
	let mapDestroyed = false;
	const isMcaGridModel = (entry: MorivisLayerEntry): entry is MeshEntry<MeshStyle> =>
		entry.type === 'model' &&
		entry.style.type === 'mesh' &&
		'minecraftRegion' in entry.format &&
		!!entry.format.minecraftRegion;
	const mcaPlacementPreview = $derived(
		isModelPlacementActive && $mcaGridPreviewStore?.id === showDataEntry?.id
			? $mcaGridPreviewStore
			: null
	);
	const effectiveMcaGridModels = $derived.by(() => {
		const models = new Map<string, MeshEntry<MeshStyle>>();
		if (!isIsolatedPreview) {
			for (const entry of layerEntries) {
				if (isMcaGridModel(entry)) models.set(entry.id, entry);
			}
		}
		if (showDataEntry && isMcaGridModel(showDataEntry)) models.set(showDataEntry.id, showDataEntry);
		if (mcaPlacementPreview) models.set(mcaPlacementPreview.id, mcaPlacementPreview);
		return [...models.values()];
	});
	const mcaGridWatchTargets = $derived({
		placementId: mcaPlacementPreview?.id ?? null,
		models: effectiveMcaGridModels.map((entry) => ({
			id: entry.id,
			region: entry.format.minecraftRegion,
			regions: entry.format.minecraftRegions,
			visible: entry.style.visible,
			transform: entry.style.transform,
			grid: entry.style.minecraftGrid
		}))
	});

	// 監視用のデータを保持
	let layerWatchTargets = $derived.by(() => {
		return layerEntries.map((entry) => {
			return {
				id: entry.id,
				// runtime state は style 監視から外して、
				// 宣言的な style 変更だけを setStyle の対象にする。
				style: entry.type === 'model' ? null : getLayerWatchStyleTarget(entry)
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
	const wcsTooBroadEntryIds = new SvelteSet<string>();

	// let mapPaneFilter = $derived(
	// 	$mapPaneScale < 1
	// 		? 'invert(1) contrast(1.2) brightness(1.1)'
	// 		: 'invert(0) contrast(1) brightness(1)'
	// );
	let mapPaneScaleTransition = $derived(
		$mapPaneScale < 1
			? 'transform 80ms cubic-bezier(0.22, 1, 0.36, 1), filter 50ms linear'
			: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), filter 160ms ease-out'
	);

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
	// 非同期の準備を終えてから、確定した入力だけでstyleを生成する。
	const prepareMapStyle = async (input: MapStyleInput, isCurrent: () => boolean) => {
		if (!isCurrent()) return;
		let referenceStyle: ReferenceStyle = { layers: [], sources: {} };
		const referenceVisibility = { line: input.showLine, label: input.showLabel };
		if (!input.isIsolatedPreview && Object.values(referenceVisibility).some(Boolean)) {
			try {
				referenceStyle = selectReferenceStyle(await loadReferenceStyle(), referenceVisibility);
			} catch (error) {
				if (!isCurrent()) return;
				console.error('Failed to load reference style:', error);
				showNotification('線・地名・POIのスタイルを取得できませんでした', 'error');
			}
		}
		if (!isCurrent()) return;
		const prepared = await prepareSourceData(
			[...(!input.isIsolatedPreview ? input.entries : []), ...input.mcaGridEntries],
			{ isCurrent }
		);
		if (!isCurrent()) return;
		const previewPrepared = await prepareSourceData(
			input.showDataEntry ? [input.showDataEntry] : [],
			{ isCurrent }
		);
		if (!isCurrent()) return;
		const contourDem = input.showContour ? mapStore.ensureContourProtocol() : undefined;
		return {
			...createMapStyle(input, { prepared, previewPrepared, referenceStyle, contourDem }),
			rasterUpdates: Object.values({ ...prepared, ...previewPrepared }).flatMap((source) =>
				source.rasterVisualizationUpdate ? [source.rasterVisualizationUpdate] : []
			)
		};
	};

	// 初期描画時
	onMount(async () => {
		if (!mapContainer) return;

		mapStore.init(mapContainer);

		styleUpdateUnsubscribers.push(
			mapStore.onMoveEnd(async () => {
				layerEntries.filter(isWcsEntry).forEach((entry) => {
					markWcsViewportReady(entry.id);
				});
				layerEntries.filter(isViewportCogEntry).forEach((entry) => {
					markCogViewportReady(entry.id);
				});
				await refreshWcsEntries(layerEntries);
				await refreshCogEntries(layerEntries);
			})
		);
		styleUpdateUnsubscribers.push(
			mapStore.onStyleLoad(async () => {
				await refreshWcsEntries(layerEntries);
				await refreshCogEntries(layerEntries);
			})
		);
	});

	onDestroy(() => {
		mapDestroyed = true;
		styleUpdateId += 1;
		mcaRegionGridController.clear();
		// Svelte storeの購読は明示的に解除しないと、画面破棄後もcallbackが残る。
		styleUpdateUnsubscribers.forEach((unsubscribe) => unsubscribe());
		clearAllCogViewportImages();
		clearAllWcsViewportImages();
		terminateCogViewportRuntime();
		if (maplibreMap) {
			maplibreMap.remove();
			maplibreMap = null;
		}
		mapStore.releaseRegionalMeshProtocol();
		mapStore.releaseH3Protocol();
		mapStore.releasePlaneGridProtocol();
		mapStore.releaseContourProtocol();
	});

	// マップのスタイルの更新
	// async処理が前後しても、最後に開始したスタイル更新だけを反映する。
	let styleUpdateId = 0;
	const styleUpdateUnsubscribers: Unsubscriber[] = [];

	const getMapStyleEntries = (entries: MorivisLayerEntry[]) => {
		return entries.filter((entry) => entry.type !== 'model');
	};

	const isWcsEntry = (entry: MorivisLayerEntry): entry is RasterWcsEntry<RasterBaseMapStyle> => {
		return entry.type === 'raster' && entry.format.type === 'wcs';
	};

	const isViewportCogEntry = (
		entry: MorivisLayerEntry
	): entry is RasterCogEntry<RasterTiffStyle> => {
		return entry.type === 'raster' && entry.format.type === 'cog' && entry.format.mode !== 'tile';
	};

	const refreshWcsEntries = async (entries: MorivisLayerEntry[]) => {
		const map = mapStore.getMap();
		if (!map) return;

		const wcsEntries = entries.filter(isWcsEntry);
		await Promise.all(
			wcsEntries.map(async (entry) => {
				try {
					const image = await fetchWcsViewportImage(entry, map);
					if (!image) return;
					mapStore.setImage(`${entry.id}_source`, image);
					wcsTooBroadEntryIds.delete(entry.id);
				} catch (error) {
					if (error instanceof WcsViewportTooBroadError) {
						if (!wcsTooBroadEntryIds.has(entry.id)) {
							showNotification(
								'WCS の表示範囲が広すぎます。ズームインして再表示してください。',
								'warning'
							);
							wcsTooBroadEntryIds.add(entry.id);
						}
						return;
					}
					console.error(error);
				}
			})
		);
	};

	const refreshCogEntries = async (entries: MorivisLayerEntry[]) => {
		const map = mapStore.getMap();
		if (!map) return;

		const cogEntries = entries.filter(isViewportCogEntry);
		await Promise.all(
			cogEntries.map(async (entry) => {
				try {
					const image = await fetchCogViewportImage(entry, map);
					if (!image) return;
					mapStore.setImage(`${entry.id}_source`, image);
				} catch (error) {
					console.error(error);
				}
			})
		);
	};

	const DEFAULT_SET_STYLE_DEBOUNCE_MS = 100;
	const setStyleDebounceHandlers: Record<number, (entries: MorivisLayerEntry[]) => void> = {};

	const setStyle = async (entries: MorivisLayerEntry[]) => {
		if (mapDestroyed) return;
		const updateId = ++styleUpdateId;
		const isCurrent = () => !mapDestroyed && updateId === styleUpdateId;
		// 非同期のspec生成前に、main/preview/draftを統合した最新のグリッドを確定する。
		const mcaGridEntries = mcaRegionGridController.sync(
			effectiveMcaGridModels,
			mcaPlacementPreview
		);
		const input: MapStyleInput = {
			entries: getMapStyleEntries(entries),
			mcaGridEntries,
			showDataEntry,
			baseMap: $selectedBaseMap,
			showHillshade: $showHillshadeLayer,
			showStreetView: $showStreetViewLayer,
			showLine: $showLineLayer,
			showLabel: $showLabelLayer,
			isIsolatedPreview,
			isGeoRefRegistrationActive,
			geoRefPreviewData,
			previewOpacity,
			isZoneRegistrationActive,
			selectedEpsgCode,
			showXYZTile: $showXYZTileLayer,
			showRegionalMesh: $showRegionalMeshLayer,
			showPlaneGrid: $showPlaneGridLayer,
			planeGridZone: $planeGridZone,
			showH3: $showH3Layer,
			showContour: $showContourLayer,
			isGlobe: $isGlobe,
			showModelView: $showModelView,
			isTerrain3d: $isTerrain3d,
			streetViewPointData,
			streetViewLineData,
			drawGeojsonData: drawGeojsonData as FeatureCollection,
			zoneBboxGeojsonData,
			searchGeojsonData
		};
		// entryの判別unionをSnapshot型で再展開せず、入力型を境界で保持する。
		const styleInput = $state.snapshot(input as unknown) as MapStyleInput;

		if (!import.meta.env.PROD) {
			// 描画方式で絞る前に、アップロードしたモデルと登録前のプレビューも出力する。
			const previewEntry = showDataEntry;
			const debugEntries = previewEntry
				? [...entries.filter((entry) => entry.id !== previewEntry.id), previewEntry]
				: entries;
			console.log('debug:entries', $state.snapshot(debugEntries));
		}

		// esri-featureプロトコルの動的管理
		const isGeojsonTileEntry = (e: MorivisLayerEntry) =>
			e.type === 'vector' &&
			'format' in e &&
			(e as { format: { type: string } }).format.type === 'geojsontile';
		const hasGeojsonTileLayer =
			entries.some(isGeojsonTileEntry) || (showDataEntry && isGeojsonTileEntry(showDataEntry));

		if (hasGeojsonTileLayer) {
			mapStore.ensureGeojsonProtocol();
		} else {
			mapStore.releaseGeojsonProtocol();
		}

		const isEsriEntry = (e: MorivisLayerEntry) =>
			e.type === 'vector' &&
			'format' in e &&
			(e as { format: { type: string } }).format.type === 'esri-feature';
		const hasEsriLayer = entries.some(isEsriEntry) || (showDataEntry && isEsriEntry(showDataEntry));

		if (hasEsriLayer) {
			mapStore.ensureEsriProtocol();
		} else {
			mapStore.releaseEsriProtocol();
		}

		const isOgcFeatureEntry = (e: MorivisLayerEntry) =>
			e.type === 'vector' &&
			'format' in e &&
			(e as { format: { type: string } }).format.type === 'ogc-feature';
		const hasOgcFeatureLayer =
			entries.some(isOgcFeatureEntry) || (showDataEntry && isOgcFeatureEntry(showDataEntry));

		if (hasOgcFeatureLayer) {
			mapStore.ensureOgcFeatureProtocol();
		} else {
			mapStore.releaseOgcFeatureProtocol();
		}

		const isWfsFeatureEntry = (e: MorivisLayerEntry) =>
			e.type === 'vector' &&
			'format' in e &&
			(e as { format: { type: string } }).format.type === 'wfs-feature';
		const hasWfsFeatureLayer =
			entries.some(isWfsFeatureEntry) || (showDataEntry && isWfsFeatureEntry(showDataEntry));

		if (hasWfsFeatureLayer) {
			mapStore.ensureWfsFeatureProtocol();
		} else {
			mapStore.releaseWfsFeatureProtocol();
		}

		const isCogEntry = (e: MorivisLayerEntry) =>
			e.type === 'raster' &&
			'format' in e &&
			(e as { format: { type: string } }).format.type === 'cog';
		const isGeoZarrEntry = (e: MorivisLayerEntry) =>
			e.type === 'raster' &&
			'format' in e &&
			(e as { format: { type: string } }).format.type === 'geozarr';
		const isCogTileEntry = (e: MorivisLayerEntry) =>
			isCogEntry(e) && (e as { format: { mode?: 'tile' | 'viewport' } }).format.mode === 'tile';
		const hasGeoZarrLayer =
			entries.some(isGeoZarrEntry) || (showDataEntry && isGeoZarrEntry(showDataEntry));
		const hasCogLayer = entries.some(isCogEntry) || (showDataEntry && isCogEntry(showDataEntry));
		const hasCogTileLayer =
			entries.some(isCogTileEntry) || (showDataEntry && isCogTileEntry(showDataEntry));

		if (hasCogTileLayer) {
			mapStore.ensureCogProtocol();
		} else {
			mapStore.releaseCogProtocol();
		}

		if (hasGeoZarrLayer) {
			mapStore.ensureGeoZarrProtocol();
		} else {
			mapStore.releaseGeoZarrProtocol();
		}

		if (hasCogLayer) {
			// 定義済みCOGエントリをCogTileManagerに登録（タイル要求前に完了させる）
			const cogEntries = [
				...entries.filter(isCogEntry),
				...(showDataEntry && isCogEntry(showDataEntry) ? [showDataEntry] : [])
			];
			await Promise.all(
				cogEntries.map(async (e) => {
					const cogEntry = e as { id: string; format: { url: string } };
					if (!CogTileManager.has(cogEntry.id)) {
						const { metadata } = await CogTileManager.register(cogEntry.id, cogEntry.format.url);
						GeoTiffCache.setDataRanges(cogEntry.id, metadata.sampleRanges);
					}
				})
			);
		}

		const isMbtilesEntry = (e: MorivisLayerEntry) =>
			'format' in e && (e as { format: { type: string } }).format.type === 'mbtiles';
		const hasMbtilesLayer =
			entries.some(isMbtilesEntry) || (showDataEntry && isMbtilesEntry(showDataEntry));

		if (hasMbtilesLayer) {
			mapStore.ensureMbtilesProtocol();
		} else {
			mapStore.releaseMbtilesProtocol();
		}

		const isDemEntry = (e: MorivisLayerEntry) =>
			e.type === 'raster' &&
			'style' in e &&
			(e as { style: { type: string } }).style.type === 'dem';
		const hasDemLayer = entries.some(isDemEntry) || (showDataEntry && isDemEntry(showDataEntry));
		const hasDemBaseMap = ['relief', 'slope', 'aspect', 'curvature'].includes($selectedBaseMap);

		if (hasDemLayer || hasDemBaseMap) {
			mapStore.ensureDemProtocol();
		} else {
			mapStore.releaseDemProtocol();
		}

		if ($showXYZTileLayer) {
			mapStore.ensureTileIndexProtocol();
		} else {
			mapStore.releaseTileIndexProtocol();
		}
		if ($showRegionalMeshLayer) {
			mapStore.ensureRegionalMeshProtocol();
		} else {
			mapStore.releaseRegionalMeshProtocol();
		}

		if ($showH3Layer) {
			mapStore.ensureH3Protocol();
		} else {
			mapStore.releaseH3Protocol();
		}

		if ($showPlaneGridLayer) {
			mapStore.ensurePlaneGridProtocol();
		} else {
			mapStore.releasePlaneGridProtocol();
		}

		const result = await prepareMapStyle(styleInput, isCurrent);
		// 後から開始した更新がある場合、この結果は古いので破棄する。
		if (!result || !isCurrent()) return;

		const rasterPreviewEntry = showDataEntry;
		applyRasterVisualizationUpdates(
			rasterPreviewEntry
				? [...entries.filter((entry) => entry.id !== rasterPreviewEntry.id), rasterPreviewEntry]
				: entries,
			result.rasterUpdates
		);
		clickableVectorIds.set(result.metadata.clickableVectorIds);
		clickableRasterIds.set(result.metadata.clickableRasterIds);
		mapAttributions.set(result.metadata.attributions);
		mapStore.setStyle(result.style);
		entries.filter(isViewportCogEntry).forEach((entry) => {
			markCogViewportReady(entry.id);
		});
		await refreshWcsEntries(entries);
		await refreshCogEntries(entries);
		if (mapDestroyed || updateId !== styleUpdateId) return;

		const tiles3dEntries = isIsolatedPreview
			? []
			: (entries.filter(
					(entry) => entry.type === 'model' && entry.format.type === '3d-tiles'
				) as AnyTiles3DEntry[]);

		if (
			showDataEntry &&
			showDataEntry.type === 'model' &&
			(showDataEntry as AnyTiles3DEntry).format.type === '3d-tiles'
		) {
			tiles3dEntries.push(showDataEntry as AnyTiles3DEntry);
		}

		const pointCloudEntries = isIsolatedPreview
			? []
			: (entries.filter(
					(entry) => entry.type === 'model' && entry.format.type === 'point-cloud'
				) as PointCloudEntry[]);

		if (
			showDataEntry &&
			showDataEntry.type === 'model' &&
			(showDataEntry as PointCloudEntry).format.type === 'point-cloud'
		) {
			pointCloudEntries.push(showDataEntry as PointCloudEntry);
		}

		const deckVectorEntries = isIsolatedPreview
			? []
			: (entries.filter(
					(entry) =>
						entry.type === 'model' &&
						(entry.format.type === 'geoarrow' || entry.format.type === 'geojson-3d')
				) as DeckVectorEntry[]);

		if (
			showDataEntry &&
			showDataEntry.type === 'model' &&
			((showDataEntry as DeckVectorEntry).format.type === 'geoarrow' ||
				(showDataEntry as DeckVectorEntry).format.type === 'geojson-3d')
		) {
			deckVectorEntries.push(showDataEntry as DeckVectorEntry);
		}

		mapStore.setTiles3DStyleEntries(tiles3dEntries);
		await mapStore.setDeckModelStyleEntries(pointCloudEntries, deckVectorEntries);
		// style更新中に新しい更新が始まった場合、古い3Dレイヤーを反映しない。
		if (updateId !== styleUpdateId) return;

		const threeModelEntries = isIsolatedPreview
			? []
			: (entries.filter(
					(entry) =>
						entry.type === 'model' &&
						(entry.format.type === 'gaussian-splat' ||
							entry.format.type === 'gltf' ||
							entry.format.type === 'vrm' ||
							entry.format.type === 'obj' ||
							entry.format.type === '3ds' ||
							entry.format.type === 'dae' ||
							entry.format.type === '3dm' ||
							entry.format.type === 'fbx' ||
							entry.format.type === 'vrml' ||
							entry.format.type === 'drc' ||
							entry.format.type === '3mf' ||
							entry.format.type === 'amf' ||
							entry.format.type === 'stl' ||
							entry.format.type === 'ifc' ||
							entry.format.type === 'pmx' ||
							entry.format.type === 'usd')
				) as ThreeModelEntry[]);

		const previewThreeModelEntry =
			showDataEntry &&
			showDataEntry.type === 'model' &&
			(showDataEntry.style.type === 'mesh' || showDataEntry.style.type === 'gaussian-splat') &&
			showDataEntry.format.type !== '3d-tiles'
				? (showDataEntry as ThreeModelEntry)
				: null;

		// setThreeLayerの直前にも確認して、古いモデル状態の上書きを防ぐ。
		if (updateId !== styleUpdateId) return;
		// 座標系選択・配置中の実モデルは各フォーム側で読み込み完了まで待って表示する。
		// ここでは同じプレビューを重複ロードせず、通常プレビューだけを同期する。
		const isThreeModelTransformPreviewActive =
			isModelPlacementActive || (isZoneRegistrationActive && !!previewThreeModelEntry);
		if (!isThreeModelTransformPreviewActive) {
			await (previewThreeModelEntry
				? mapStore.setThreeLayer([previewThreeModelEntry], 'preview')
				: showDataEntry
					? mapStore.setThreeLayer([], 'preview')
					: mapStore.setThreeLayer(threeModelEntries, 'main'));
		}

		mapStore.terrainReload();

		if (!maplibreMap) return;
	};

	const getSetStyleDebounceHandler = (wait = DEFAULT_SET_STYLE_DEBOUNCE_MS) => {
		const existingHandler = setStyleDebounceHandlers[wait];
		if (existingHandler) return existingHandler;

		const handler = debounce((entries: MorivisLayerEntry[]) => {
			void setStyle(entries);
		}, wait);
		setStyleDebounceHandlers[wait] = handler;
		return handler;
	};

	const setStyleDebounce = (entries: MorivisLayerEntry[], wait?: number) => {
		getSetStyleDebounceHandler(wait)(entries);
	};

	const requestStyleUpdateByDependency = (_dependency: unknown) => {
		setStyleDebounce(layerEntries as MorivisLayerEntry[]);
	};

	const syncHighlightLayers = () => {
		if (isIsolatedPreview) {
			mapStore.clearHighlightLayers();
			mapStore.syncPatternAnimation();
			return;
		}

		const highlightLayers = createHighlightLayerItems(
			getMapStyleEntries(layerEntries as MorivisLayerEntry[])
		);
		mapStore.setHighlightLayers(highlightLayers);
	};

	// レイヤーの更新を監視
	$effect(() => {
		requestStyleUpdateByDependency($state.snapshot(mcaGridWatchTargets));
	});

	$effect(() => {
		$state.snapshot(layerWatchTargets);
		setStyleDebounce(layerEntries as MorivisLayerEntry[]);
	});

	styleUpdateUnsubscribers.push(
		isTerrain3d.subscribe((is3d) => {
			mapStore.toggleTerrain(is3d);
		}),
		isGlobe.subscribe(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		}),
		selectedBaseMap.subscribe((_baseMap: BaseMapType) => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		}),
		showHillshadeLayer.subscribe(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		}),
		showLabelLayer.subscribe(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		}),
		showLineLayer.subscribe(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		}),
		showXYZTileLayer.subscribe(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		}),
		showPlaneGridLayer.subscribe(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		}),
		showContourLayer.subscribe(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		}),
		planeGridZone.subscribe(() => {
			if ($showPlaneGridLayer) setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		}),
		showH3Layer.subscribe(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		}),
		showRegionalMeshLayer.subscribe(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		})
	);
	// ストリートビューの表示
	styleUpdateUnsubscribers.push(
		showStreetViewLayer.subscribe(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[], 0);
		})
	);
	// モデルビュー中は空と大気を外し、閉じたら通常のスタイルへ戻す。
	styleUpdateUnsubscribers.push(
		showModelView.subscribe(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[], 0);
		})
	);

	styleUpdateUnsubscribers.push(
		mapStore.onTerrain(() => {
			setStyleDebounce(layerEntries as MorivisLayerEntry[]);
		})
	);

	styleUpdateUnsubscribers.push(
		mapStore.onStyleLoad(() => {
			syncHighlightLayers();
		})
	);

	// 検索結果の更新
	$effect(() => {
		// 引数として渡すことで、このeffectを検索結果GeoJSONの変更に反応させる。
		requestStyleUpdateByDependency(searchGeojsonData);
	});

	$effect(() => {
		requestStyleUpdateByDependency({
			previewUrl: isGeoRefRegistrationActive ? (geoRefPreviewData?.url ?? null) : null,
			showGeoRefTransform: isGeoRefRegistrationActive,
			previewOpacity: isGeoRefRegistrationActive ? previewOpacity : null
		});
		setStyleDebounce(layerEntries as MorivisLayerEntry[]);
	});

	// データプレビュー
	$effect(() => {
		setStyleDebounce(layerEntries as MorivisLayerEntry[], 0);
		threeJsManager.setGroupVisibility(!showDataEntry || isGeoRefRegistrationActive);
	});

	// 座標系選択
	$effect(() => {
		// bbox候補の増減をスタイル更新の依存にする。
		requestStyleUpdateByDependency(zoneBboxGeojsonData.features.length);
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

	const setRelativePath = (file: File, relativePath: string) => {
		Object.defineProperty(file, 'morivisRelativePath', {
			value: relativePath,
			configurable: true
		});
		return file;
	};

	const extractZipFiles = async (zipFile: File): Promise<File[]> => {
		const JSZip = (await import('jszip')).default;
		const zip = await JSZip.loadAsync(zipFile);
		const files: File[] = [];
		const entries: [string, import('jszip').JSZipObject][] = [];

		zip.forEach((path, entry) => {
			if (!entry.dir) entries.push([path, entry]);
		});

		for (const [path, entry] of entries) {
			const blob = await entry.async('blob');
			const fileName = path.split('/').pop() ?? path;
			files.push(setRelativePath(new File([blob], fileName, { type: blob.type }), path));
		}

		return files;
	};

	// ドロップ完了時にファイルを取得
	const onDropFile: (files: File[]) => void = async (files) => {
		if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
			try {
				const extracted = await extractZipFiles(files[0]);
				if (extracted.length > 0) {
					dropFile = extracted;
					return;
				}
			} catch {
				// 展開失敗時は通常フローへ
			}
		}

		dropFile = files;
	};

	// エントリーIDのドロップ完了時にレイヤーを追加
	const onDropEntryId = (entryId: string) => {
		if (activeLayerIdsStore.has(entryId)) {
			return; // すでにアクティブなレイヤーに含まれている場合は何もしない
		}
		activeLayerIdsStore.add(entryId);
		const entry = layerEntries.find((entry) => entry.id === entryId);
		if (entry) {
			showLayerAddedNotification(entry);
		}
	};
</script>

<DropContainer
	bind:isDragover
	onDragover={dragover}
	onDragleave={dragleave}
	{onDropFile}
	{onDropEntryId}
	disabled={isGeoRefRegistrationActive}
	class="h-full w-full"
>
	<div
		role="region"
		class="bg-main flex items-center justify-center overflow-hidden {$isStreetView &&
		$mapMode === 'small'
			? 'absolute transform border border-gray-300 max-lg:bottom-0 max-lg:h-1/2 max-lg:w-full lg:bottom-2 lg:left-2 lg:z-20 lg:h-[200px] lg:w-[300px] lg:rounded-lg'
			: 'relative h-full w-full grow'}"
		style:transform={`scale(${$mapPaneScale})`}
		style:transform-origin="center center"
		style:transition={mapPaneScaleTransition}
	>
		<div
			bind:this={mapContainer}
			class="h-full w-full overflow-hidden bg-black saturate-[90%] transition-opacity lg:rounded-lg {!showMapCanvas &&
			$mapMode === 'view'
				? 'opacity-0'
				: $isStreetView && $mapMode === 'small'
					? ''
					: 'opacity-100 lg:rounded-tl-[35px] lg:rounded-br-[35px]'}"
		>
			{#if maplibreMap}
				<HighlightMarkerManager map={maplibreMap} {highlightMarkerState} />
			{/if}
		</div>
		<!-- 地図コンテナオーバーレイ -->
		<div
			class="border-sub pointer-events-none absolute h-full w-full overflow-hidden rounded-[0.5rem] border transition-colors {isDragover
				? ' bg-accent opacity-50'
				: ' opacity-0'}"
		></div>

		{#if !$isStreetView && !showDataEntry && !transformOptionMode && !$showDataMenu}
			<!-- PC用地図コントロール -->
			<div class="absolute right-0 bottom-0 max-lg:hidden">
				<Compass />
			</div>
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
		{transformOptionMode}
		bind:focusBbox
	/>

	<!-- <WebGLCanvasLayer map={maplibreMap} canvasSource={webGLCanvasSource} /> -->
	<MouseManager
		{showDataEntry}
		bind:markerLngLat={selectionMarkerLngLat}
		bind:featureMenuData
		bind:highlightMarkerState
		bind:showMarker={showSelectionMarker}
		bind:clickedLayerIds
		bind:cameraBearing
		bind:isExternalCameraUpdate
		bind:selectedSearchId
		bind:selectedSearchResultData
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
	@media (width >= 48rem /* 768px */) {
		:global(.maplibregl-canvas) {
			border-radius: 0.5rem !important;
			overflow: hidden !important;
		}
	}
</style>
