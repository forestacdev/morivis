<script lang="ts">
	import turfBbox from '@turf/bbox';
	import turfBearing from '@turf/bearing';
	import { delay } from 'es-toolkit';
	import type { FeatureCollection } from 'geojson';
	import { onMount, onDestroy, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { slide } from 'svelte/transition';

	import Processing from './Processing.svelte';
	import type { NextPointData, StreetViewPoint, StreetViewPointGeoJson } from './types/street-view';
	import type { ContextMenuState } from './types/ui';
	import { getPropertiesFromPMTiles } from './utils/data/pmtiles-properties';
	import type {
		ResultAddressData,
		ResultCoordinateData,
		ResultData,
		ResultPoiData,
		SearchGeojsonData
	} from './utils/data/search-result';
	import { lonLatToTileCoords } from './utils/map/tile-coordinate';
	import { checkPc } from './utils/platform/viewport';

	import { page } from '$app/state';
	import { ENTRY_PMTILES_VECTOR_PATH, STREET_VIEW_DATA_PATH } from '$routes/constants';
	import ContextMenu from '$routes/map/components/ContextMenu.svelte';
	import DataMenu from '$routes/map/components/data_menu/DataMenu.svelte';
	import ConfirmationDialog from '$routes/map/components/dialog/ConfirmationDialog.svelte';
	import ImagePreviewDialog from '$routes/map/components/dialog/ImagePreviewDialog.svelte';
	import {
		getLayerFeaturePanelSummary,
		hasFeaturePanelSummaryContent
	} from '$routes/map/components/feature_menu/feature-panel-summary';
	import FeaturePanel from '$routes/map/components/feature_menu/FeaturePanel.svelte';
	import FeaturePanelLayerContent from '$routes/map/components/feature_menu/FeaturePanelLayerContent.svelte';
	import FeaturePanelLoading from '$routes/map/components/feature_menu/FeaturePanelLoading.svelte';
	import Footer from '$routes/map/components/Footer.svelte';
	import HeaderMenu from '$routes/map/components/Header.svelte';
	import { setResetLayerEntries } from '$routes/map/components/layer_menu/context';
	import LayerMenu from '$routes/map/components/layer_menu/LayerMenu.svelte';
	import LayerStyleMenu from '$routes/map/components/layer_style_menu/LayerStyleMenu.svelte';
	import MapLibreMap from '$routes/map/components/Map.svelte';
	import MobileDebugLogger from '$routes/map/components/mobile/DebugLogger.svelte';
	import MobileFeatureMenuCard from '$routes/map/components/mobile/FeatureMenuCard.svelte';
	import MobileFooter from '$routes/map/components/mobile/Footer.svelte';
	import MobileMapControl from '$routes/map/components/mobile/MapControl.svelte';
	import ModelViewCanvas from '$routes/map/components/model_view/ModelViewCanvas.svelte';
	import NotificationMessage from '$routes/map/components/NotificationMessage.svelte';
	import OtherMenu from '$routes/map/components/OtherMenu.svelte';
	import DataPreviewDialog from '$routes/map/components/preview_menu/DataPreviewDialog.svelte';
	import PreviewMenu from '$routes/map/components/preview_menu/PreviewMenu.svelte';
	import SearchMenu from '$routes/map/components/search_menu/SearchMenu.svelte';
	import StreetViewCanvas from '$routes/map/components/street_view/ThreeCanvas.svelte';
	import Tooltip from '$routes/map/components/Tooltip.svelte';
	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import type {
		GeoRefConfirmPayload,
		GeoRefData,
		GeoRefPreviewData
	} from '$routes/map/components/upload/form/transform/georef-types';
	import { getAllowedTransformModesForIssue } from '$routes/map/components/upload/transform-policy';
	import {
		findCatalogEntry,
		geoDataEntries,
		isLazyCatalogEntry,
		needsLazyHydration,
		resolveMorivisLayerEntry
	} from '$routes/map/data/entries';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import { createPointCloudEntry } from '$routes/map/data/entries/model';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import { createGeoJsonEntry, geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
	import type {
		MorivisRasterEntry,
		RasterDemStyle,
		RasterImageEntry,
		RasterTiffStyle
	} from '$routes/map/data/types/raster';
	import type { GeoJsonMetaData, PointEntry, TileMetaData } from '$routes/map/data/types/vector';
	import { filterByPopupKeys } from '$routes/map/data/types/vector/properties';
	import {
		createLayerFeaturePanelData,
		createSearchFeaturePanelData,
		type DialogType,
		type FeatureMenuData,
		type FeaturePanelData,
		type HighlightMarkerState,
		type UploadFiles
	} from '$routes/map/types';
	import type { DrawGeojsonData } from '$routes/map/types/draw';
	import type { FeatureCollection as AppFeatureCollection } from '$routes/map/types/geojson';
	import type { PolygonGeometry, PointGeometry } from '$routes/map/types/geometry';
	import { GeoRefVectorSourceCache } from '$routes/map/utils/cache/georef-vector-source-cache';
	import { GeoTiffCache } from '$routes/map/utils/cache/raster/geotiff-cache';
	import { getFgbToGeojson } from '$routes/map/utils/formats/geojson';
	import { encodeAllBandsToTerrarium } from '$routes/map/utils/formats/geotiff';
	import { createRasterMeshEntryInWorker } from '$routes/map/utils/formats/geotiff/mesh-parallel';
	import { NetCDFDataCache } from '$routes/map/utils/formats/netcdf/cache';
	import { generateThumbnail } from '$routes/map/utils/formats/raster/thumbnail';
	import { featureCollectionToGeoRefData } from '$routes/map/utils/formats/vector/rasterize';
	import {
		getPopupImageFieldKey,
		resolveGeneratedPoiIconUrl,
		resolvePopupImageUrl
	} from '$routes/map/utils/icon';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import type { LngLat } from '$routes/map/utils/maplibre';
	import maplibregl from '$routes/map/utils/maplibre';
	import { fetchJsonWithDevProxy } from '$routes/map/utils/platform/request';
	import {
		get3dParams,
		getParams,
		getStreetViewParams
	} from '$routes/map/utils/platform/url-params';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import {
		getProjContext,
		type EpsgCode,
		type EpsgInfoWithCode
	} from '$routes/map/utils/proj/dict';
	import type { PickedModelFeature } from '$routes/map/utils/three/layer-manager';
	import {
		warpGeoJSONByCornersParallel,
		warpPointCloudByCornersParallel
	} from '$routes/map/utils/transform/georef';
	import {
		isStreetView,
		mapMode,
		modelViewRequest,
		selectedLayerId,
		isStyleEdit,
		isDebugMode
	} from '$routes/stores';
	import { debugLog } from '$routes/stores/debug';
	import { activeLayerIdsStore, showStreetViewLayer } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';
	import { themeMode } from '$routes/stores/theme';
	import {
		isBlocked,
		showDataMenu,
		showLayerMenu,
		showOtherMenu,
		showInfoDialog,
		showSearchMenu,
		showTermsDialog,
		isProcessing,
		showModelView
	} from '$routes/stores/ui';
	let map = $state.raw<maplibregl.Map | null>(null); // MapLibreのマップオブジェクト

	// アップロード関連コンポーネント（PC時のみ動的ロード）
	let UploadDialog = $state.raw<any>(null);
	let GeoRefForm = $state.raw<any>(null);

	const isPc = typeof window !== 'undefined' && checkPc();
	if (isPc) {
		Promise.all([
			import('$routes/map/components/upload/BaseDialog.svelte'),
			import('$routes/map/components/upload/form/transform/GeoRefForm.svelte')
		]).then(([uploadMod, geoRefMod]) => {
			UploadDialog = uploadMod.default;
			GeoRefForm = geoRefMod.default;
		});
	}

	let tempLayerEntries = $state<MorivisLayerEntry[]>([]); // 一時レイヤーデータ

	const getLayerEntriesData = (): MorivisLayerEntry[] => {
		// tempが空の場合は定数のみ返す
		if (tempLayerEntries.length === 0) {
			return geoDataEntries;
		}
		return [...geoDataEntries, ...tempLayerEntries];
	};

	let layerEntries = $state<MorivisLayerEntry[]>([]); // アクティブなレイヤーデータ
	const isMeshEntry = (entry: MorivisLayerEntry): entry is MeshEntry<MeshStyle> => {
		return entry.type === 'model' && entry.style.type === 'mesh';
	};
	let modelViewEntries = $derived.by(() => {
		const request = $modelViewRequest;
		if (!request) return [];
		return request.entryIds
			.map((entryId) => layerEntries.find((candidate) => candidate.id === entryId))
			.filter((entry): entry is MeshEntry<MeshStyle> => Boolean(entry && isMeshEntry(entry)));
	});
	let showDataEntry = $state<MorivisLayerEntry | null>(null); // プレビュー用のデータ
	let dropFile = $state<UploadFiles>(null); // ドロップしたファイル
	let remoteGeoZarrUrl = $state<string | null>(null);
	let remotePmtilesUrl = $state<string | null>(null);
	let remoteRasterUrl = $state<string | null>(null);
	let remoteVectorUrl = $state<string | null>(null);
	let remoteTiles3dUrl = $state<string | null>(null);
	let remoteWmtsUrl = $state<string | null>(null);
	let remoteFeatureServiceUrl = $state<string | null>(null);
	let pendingTileUrl = $state<string | null>(null);

	let isStyleEditEntry = $derived.by(() => {
		const targetEntry = layerEntries.find((entry) => entry.id === $selectedLayerId);
		if (targetEntry && $isStyleEdit) {
			return targetEntry;
		} else {
			return null;
		}
	});

	// 描画データ
	let drawGeojsonData = $state.raw<DrawGeojsonData>({
		type: 'FeatureCollection',
		features: []
	});

	// ストリートビューのデータ
	let streetViewPoint = $state<StreetViewPoint | null>(null);
	let nextPointData = $state<NextPointData[] | null>(null);

	// ストリートビューのpointデータ
	let streetViewPointData = $state.raw<StreetViewPointGeoJson>({
		type: 'FeatureCollection',
		features: []
	});
	// ストリートビューのlineデータ
	let streetViewLineData = $state.raw<FeatureCollection>({
		type: 'FeatureCollection',
		features: []
	});

	let searchGeojsonData = $state.raw<SearchGeojsonData | null>(null);

	// ノード接続データ
	type NodeConnections = Record<string, string[]>;
	let nodeConnectionsJson = $state<NodeConnections>({});

	// ストリートビューのカメラの向き
	let cameraBearing = $state<number>(0);
	let isExternalCameraUpdate = $state<boolean>(false); // 外部からのカメラ更新かどうか

	// 起動時のストリートビュー判定
	let isInitialStreetViewEntry = $state<boolean>(false);

	// canvasの表示制御
	let showMapCanvas = $state<boolean>(true);
	let showThreeCanvas = $state<boolean>(false);

	// 地物情報のデータ
	let featureMenuData = $state<FeatureMenuData | null>(null);
	let highlightMarkerState = $state<HighlightMarkerState | null>(null);
	let resetModelView = $state<(() => void) | null>(null);
	let modelViewFpsMode = $state(false);

	// 選択マーカー
	let showSelectionMarker = $state<boolean>(false); // マーカーの表示
	let selectionMarkerLngLat = $state<LngLat | null>(null); // マーカーの位置

	// ストリートビューのマーカー
	let showAngleMarker = $state<boolean>(false); // マーカーの表示
	let angleMarkerLngLat = $state<LngLat>(new maplibregl.LngLat(0, 0)); // マーカーの位置

	let showDialogType = $state<DialogType>(null);
	let showDebugWindow = $state<boolean>(false); // デバッグウィンドウの表示
	let selectedEpsgCode = $state<EpsgCode>('3857'); //
	let focusBbox = $state<[number, number, number, number] | null>(null); // フォーカスするバウンディングボックス
	let zoneBboxGeojsonData = $state<
		AppFeatureCollection<PolygonGeometry | PointGeometry, EpsgInfoWithCode>
	>({
		type: 'FeatureCollection',
		features: []
	});

	let zoneConfirmedEpsg = $state<EpsgCode | null>(null);
	let pendingZoneGeoRefData = $state.raw<PendingZoneGeoRefData | null>(null);
	let transformOptionMode = $state<TransformOptionMode>(null);
	let isPreparingGeoRefData = $state(false);
	let isModelPlacementActive = $derived(
		transformOptionMode === 'georef' && !!showDataEntry && isMeshEntry(showDataEntry)
	);

	let geoRefData = $state.raw<GeoRefData | null>(null);
	let geoRefPreviewData = $state<GeoRefPreviewData | null>(null);
	let geoRefPreviewOpacity = $state(0.6);
	let allowedTransformModes = $derived.by(() => {
		if (geoRefData?.allowedTransformModes?.length) {
			return geoRefData.allowedTransformModes;
		}

		if (showDialogType === 'model' && isModelPlacementActive) {
			return getAllowedTransformModesForIssue(showDialogType, 'placement-missing');
		}

		if (showDialogType && (transformOptionMode === 'zone' || pendingZoneGeoRefData)) {
			return getAllowedTransformModesForIssue(showDialogType, 'crs-missing');
		}

		return [];
	});

	const closeGeoRefUi = () => {
		if (geoRefData?.sourceFeatureCollectionId) {
			GeoRefVectorSourceCache.remove(geoRefData.sourceFeatureCollectionId);
		}
		geoRefPreviewData = null;
		geoRefPreviewOpacity = 0.6;
		transformOptionMode = null;
		geoRefData = null;
		showDialogType = null;
		dropFile = null;
	};

	const finalizeGeoRefEntry = async (payload: GeoRefConfirmPayload) => {
		if (!geoRefData) return;

		isProcessing.set(true);
		try {
			const data = geoRefData;
			const { bbox, corners } = payload;

			debugLog.info(
				`+page finalizeGeoRefEntry開始: id=${data.entryId}, mode=${data.registrationMode}, size=${data.imageWidth}x${data.imageHeight}`
			);

			if (data.sourceType === 'vector' && data.sourceFeatureCollectionId && data.sourceCorners) {
				const sourceFeatureCollection = GeoRefVectorSourceCache.get(data.sourceFeatureCollectionId);
				if (!sourceFeatureCollection) {
					throw new Error('GeoRefベクターの元データが見つかりません');
				}

				const plainCorners = corners.map(([lng, lat]) => [lng, lat]) as typeof corners;
				const warpedGeojson = await warpGeoJSONByCornersParallel(
					sourceFeatureCollection,
					data.sourceCorners,
					plainCorners
				);
				const warpedType = geometryTypeToEntryType(warpedGeojson as AppFeatureCollection);
				const warpedBbox = turfBbox(warpedGeojson as AppFeatureCollection) as [
					number,
					number,
					number,
					number
				];

				if (!warpedType || !isBboxValid(warpedBbox)) {
					throw new Error('GeoRefベクター変形後のデータが不正です');
				}

				const warpedEntry = await createGeoJsonEntry(
					warpedGeojson as AppFeatureCollection,
					warpedType,
					data.entryName,
					warpedBbox
				);

				if (!warpedEntry) {
					throw new Error('GeoRefベクターのエントリ生成に失敗しました');
				}

				debugLog.info(
					`+page finalizeGeoRefEntry ベクター生成: id=${warpedEntry.id}, bounds=${warpedBbox.join(',')}`
				);
				closeGeoRefUi();
				showDataEntry = warpedEntry;
				showNotification('ベクターの位置を設定しました', 'success');
				return;
			}

			if (data.sourceType === 'pointcloud' && data.pointCloudConfig) {
				const sourceBbox = data.pointCloudConfig.sourceBbox;
				const sourceCorners = [
					[sourceBbox[0], sourceBbox[3]],
					[sourceBbox[2], sourceBbox[3]],
					[sourceBbox[2], sourceBbox[1]],
					[sourceBbox[0], sourceBbox[1]]
				] as typeof corners;
				const plainCorners = corners.map(([lng, lat]) => [lng, lat]) as typeof corners;
				const warpedPositions = await warpPointCloudByCornersParallel(
					data.pointCloudConfig.positions,
					sourceCorners,
					plainCorners
				);
				const pointCloudEntry = createPointCloudEntry(
					data.entryName || '点群データ',
					{
						positions: warpedPositions,
						colors: data.pointCloudConfig.colors,
						pointCount: data.pointCloudConfig.pointCount
					},
					bbox
				);

				debugLog.info(
					`+page finalizeGeoRefEntry 点群生成: id=${pointCloudEntry.id}, bounds=${bbox.join(',')}`
				);
				closeGeoRefUi();
				showDataEntry = pointCloudEntry;
				showNotification('点群の位置を設定しました', 'success');
				return;
			}

			GeoTiffCache.setBbox(data.entryId, bbox);
			GeoTiffCache.setSize(data.entryId, data.imageWidth, data.imageHeight);
			GeoTiffCache.setNumBands(data.entryId, data.numBands);

			const mapImage = generateThumbnail({
				bands: data.parsedBands,
				width: data.imageWidth,
				height: data.imageHeight
			});

			if (data.registrationMode === 'mesh' && data.numBands === 1) {
				const entry = await createRasterMeshEntryInWorker({
					id: data.entryId,
					name: data.entryName || 'GeoTIFF 3Dメッシュ',
					band: data.parsedBands[0],
					width: data.imageWidth,
					height: data.imageHeight,
					nodata: data.parsedNodata,
					bounds: bbox,
					corners,
					mapImage,
					baseValue: data.meshConfig?.baseValue,
					heightScale: data.meshConfig?.heightScale,
					autoHeightScale: data.meshConfig?.autoHeightScale
				});

				if (data.meshConfig?.attribution) {
					entry.metaData.attribution = data.meshConfig.attribution;
				}
				if (data.meshConfig?.opacity != null) {
					entry.style.opacity = data.meshConfig.opacity;
				}
				if (entry.style.shading && data.meshConfig?.shadingEnabled != null) {
					entry.style.shading = {
						...entry.style.shading,
						enabled: data.meshConfig.shadingEnabled
					};
				}
				if (entry.style.heightColorRamp && data.meshConfig?.heightColorRampEnabled != null) {
					entry.style.heightColorRamp = {
						...entry.style.heightColorRamp,
						enabled: data.meshConfig.heightColorRampEnabled
					};
				}
				if (data.meshConfig?.temporalDimension) {
					entry.state = {
						...entry.state,
						dimension: {
							currentIndex: data.meshConfig.initialDimensionIndex ?? 0
						}
					};
					entry.properties = {
						...entry.properties,
						temporal: {
							dimension: data.meshConfig.temporalDimension
						}
					};

					const cachedEntry = NetCDFDataCache.get(data.entryId);
					if (cachedEntry && data.meshConfig.heightScale != null) {
						cachedEntry.meshConfig = {
							baseValue: data.meshConfig.baseValue ?? 0,
							heightScale: data.meshConfig.heightScale,
							maxGridSize: 192
						};
					}
				}

				debugLog.info(`+page finalizeGeoRefEntry メッシュ生成: id=${entry.id}`);
				closeGeoRefUi();
				showDataEntry = entry;
				showNotification('3Dメッシュを生成しました', 'success');
				return;
			}

			await encodeAllBandsToTerrarium(
				data.entryId,
				data.parsedBands,
				data.imageWidth,
				data.imageHeight,
				data.parsedNodata,
				data.dataRanges
			);

			const isSingleBand = data.numBands === 1;
			const entry: RasterImageEntry<RasterTiffStyle> = {
				id: data.entryId,
				type: 'raster',
				format: {
					type: 'image',
					url: ''
				},
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					attribution: 'GeoTIFF',
					name: data.entryName || '画像データ',
					tileSize: 256,
					bounds: bbox,
					imageCorners: corners,
					xyzImageTile: findCenterTile(bbox),
					mapImage
				},
				properties: {
					bands: {
						numBands: data.numBands
					}
				},
				interaction: {
					...DEFAULT_RASTER_BASEMAP_INTERACTION
				},
				style: {
					type: 'tiff',
					opacity: 1,
					visible: true,
					visualization: {
						mode: isSingleBand ? 'single' : 'multi',
						uniformsData: {
							single: {
								index: 0,
								min: data.bandMinMax.min,
								max: data.bandMinMax.max,
								colorMap: 'jet'
							},
							multi: {
								r: { index: 0, min: data.multiBandMinMax.r.min, max: data.multiBandMinMax.r.max },
								g: {
									index: data.numBands >= 2 ? 1 : 0,
									min: data.multiBandMinMax.g.min,
									max: data.multiBandMinMax.g.max
								},
								b: {
									index: data.numBands >= 3 ? 2 : 0,
									min: data.multiBandMinMax.b.min,
									max: data.multiBandMinMax.b.max
								}
							}
						}
					}
				}
			};

			debugLog.info(
				`+page finalizeGeoRefEntry ラスター生成: id=${entry.id}, bounds=${bbox.join(',')}`
			);
			closeGeoRefUi();
			showDataEntry = entry;
			showNotification('画像の位置を設定しました', 'success');
		} catch (error) {
			debugLog.error(
				`+page finalizeGeoRefEntry失敗: ${error instanceof Error ? error.message : String(error)}`
			);
			showNotification(
				error instanceof Error ? error.message : 'エンコードに失敗しました',
				'error'
			);
			console.error(error);
		} finally {
			isProcessing.set(false);
		}
	};

	const openPendingZoneGeoRef = async (pendingData: PendingZoneGeoRefData, epsgCode: EpsgCode) => {
		isProcessing.set(true);
		isPreparingGeoRefData = true;
		const nextAllowedTransformModes =
			getAllowedTransformModesForIssue(showDialogType, 'crs-missing') ?? [];
		debugLog.info(
			`GeoRef準備開始: entryName=${pendingData.entryName}, epsg=${epsgCode}, featureCount=${pendingData.featureCollection.features.length}`
		);

		try {
			const prjContent = getProjContext(epsgCode);
			const transformedGeojson = (await transformGeoJSONParallel(
				pendingData.featureCollection,
				prjContent
			)) as FeatureCollection;
			const bbox = turfBbox(transformedGeojson);

			if (!bbox || !isBboxValid(bbox)) {
				debugLog.warn(`GeoRef準備中断: bbox不正 entryName=${pendingData.entryName}`);
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const nextGeoRefData = await featureCollectionToGeoRefData({
				featureCollection: transformedGeojson as AppFeatureCollection,
				entryName: pendingData.entryName
			});
			geoRefData = {
				...nextGeoRefData,
				allowedTransformModes: nextAllowedTransformModes
			};
			debugLog.info(
				`GeoRef画像生成完了: id=${geoRefData.entryId}, width=${geoRefData.imageWidth}, height=${geoRefData.imageHeight}`
			);
			transformOptionMode = 'georef';
		} catch (error) {
			debugLog.error(`GeoRef準備失敗: ${error instanceof Error ? error.message : String(error)}`);
			showNotification('GeoJSON画像の作成中にエラーが発生しました', 'error');
			console.error(error);
		} finally {
			isPreparingGeoRefData = false;
			isProcessing.set(false);
		}
	};

	// 検索ワード
	let inputSearchWord = $state<string>('');
	let searchResults = $state<ResultData[] | null>([]);
	let selectedSearchId = $state<number | null>(null);
	let selectedSearchResultData = $state<
		ResultPoiData | ResultAddressData | ResultCoordinateData | null
	>(null);

	let featurePanelData = $derived.by<FeaturePanelData | null>(() => {
		if (featureMenuData) {
			return createLayerFeaturePanelData(featureMenuData);
		}

		if (selectedSearchResultData) {
			return createSearchFeaturePanelData(selectedSearchResultData, selectedSearchId);
		}

		return null;
	});

	$effect(() => {
		if (transformOptionMode === null) {
			pendingZoneGeoRefData = null;
		}
	});

	$effect(() => {
		if (
			transformOptionMode !== 'georef' ||
			geoRefData ||
			!pendingZoneGeoRefData ||
			isPreparingGeoRefData
		) {
			return;
		}

		const pendingData = pendingZoneGeoRefData;
		const epsg = selectedEpsgCode;
		debugLog.info(`GeoRef自動生成トリガー: epsg=${epsg}, entryName=${pendingData.entryName}`);
		void openPendingZoneGeoRef(pendingData, epsg);
	});

	$effect(() => {
		const entry = showDataEntry;
		if (!entry) {
			debugLog.info('showDataEntry=null');
			return;
		}

		debugLog.info(
			`showDataEntry set: id=${entry.id}, type=${entry.type}, name=${entry.metaData.name}`
		);
	});

	let mobileLayerFeatureSummaryPromise = $derived.by(() => {
		if (!featureMenuData) return Promise.resolve(null);
		return getLayerFeaturePanelSummary(featureMenuData, layerEntries);
	});

	let mobileTargetLayer = $derived.by(() => {
		const currentFeatureMenuData = featureMenuData;
		if (!currentFeatureMenuData) return null;
		return layerEntries.find((entry) => entry.id === currentFeatureMenuData.layerId) ?? null;
	});

	let mobileHasAttributeTab = $derived.by(() => {
		if (!featureMenuData || !mobileTargetLayer || !featureMenuData.properties) {
			return false;
		}

		const propId = featureMenuData.properties._prop_id;
		if (propId) return false;

		const popupKeys =
			mobileTargetLayer.type === 'vector'
				? mobileTargetLayer.properties.attributeView.popupKeys
				: [];
		const imageKey =
			mobileTargetLayer.type === 'vector'
				? getPopupImageFieldKey(mobileTargetLayer.properties)
				: null;
		const displayProps =
			popupKeys.length > 0
				? filterByPopupKeys(featureMenuData.properties, popupKeys)
				: featureMenuData.properties;

		return Object.entries(displayProps).some(
			([key, value]) =>
				key !== '_prop_id' &&
				value !== '' &&
				value !== null &&
				value !== undefined &&
				value !== false &&
				imageKey !== key
		);
	});

	let mobileFeaturePanelResetKey = $derived.by(() => {
		if (!featureMenuData) return 'empty';
		return `${featureMenuData.layerId}:${featureMenuData.featureId}`;
	});

	// 画像プレビュー
	let imagePreviewUrl = $state<string | null>(null);
	let imageBounds = $state<[number, number, number, number] | null>(null);

	// 右クリックメニュー
	let contextMenuState = $state<ContextMenuState | null>(null);

	let isDragover = $state(false);

	$effect(() => {
		if (selectedSearchId) {
			mapStore.setFilter('@search_result', ['!=', ['id'], selectedSearchId]);
			mapStore.setFilter('@search_result_label', ['!=', ['id'], selectedSearchId]);
		} else {
			mapStore.setFilter('@search_result', null);
			mapStore.setFilter('@search_result_label', null);
		}
	});

	$effect(() => {
		if (showDataEntry || transformOptionMode) {
			themeMode.setMode('preview');
		} else {
			themeMode.setMode('default');
		}
	});

	// スクリーンショットモード
	const isScreenshotMode = $derived(page.url.searchParams.get('mode') === 'screenshot');

	// 初期化完了のフラグ
	let isInitialized = $state<boolean>(false);

	onMount(async () => {
		/** レイヤーメニューの表示 */

		const params = getParams(location.search);

		if (params) {
			if (params.debug && params.debug === '1') {
				isDebugMode.set(true);
			}
		}

		isInitialized = true;

		// スクリーンショットモードではストリートビューデータの読み込みをスキップ
		if (isScreenshotMode) {
			isInitialStreetViewEntry = true;
			return;
		}

		const geojson = await getFgbToGeojson(`${STREET_VIEW_DATA_PATH}/nodes.fgb`);
		streetViewPointData = geojson as unknown as StreetViewPointGeoJson;

		streetViewLineData = await getFgbToGeojson(`${STREET_VIEW_DATA_PATH}/links.fgb`);

		nodeConnectionsJson = await fetchJsonWithDevProxy(
			`${STREET_VIEW_DATA_PATH}/node_connections.json`
		);

		// ストリートビューのパラメータを取得
		const nodeId = getStreetViewParams();

		if (nodeId) {
			const point = streetViewPointData.features.find(
				(point) => point.properties.node_id === Number(nodeId)
			);
			if (point) {
				showStreetViewLayer.set(true);
				setPoint(Number(nodeId));
			}
		}

		isInitialStreetViewEntry = true;

		mapStore.onLoad(() => {
			const terrain3d = get3dParams();
			if (terrain3d === '1' && checkPc()) {
				// mapStore.toggleTerrain(true);
				// isTerrain3d.set(true);
			}
		});
	});

	// ストリートビューのデータの取得
	const setPoint = (nodeId: number) => {
		const pointId = nodeId;

		if (!pointId) {
			console.warn('Point ID is not defined');
			return;
		}

		const linkPoints = nodeConnectionsJson[pointId] || [];

		const point = streetViewPointData.features.find(
			(point) => point.properties.node_id === pointId
		);

		if (!point) {
			console.warn(`Street view point with ID ${pointId} not found.`);
			return;
		}

		streetViewPoint = point as StreetViewPoint;
		isStreetView.set(true);

		const nextPoints = [pointId, ...linkPoints]
			.map((id) => streetViewPointData.features.find((point) => point.properties.node_id === id))
			.filter((nextPoint): nextPoint is StreetViewPoint => nextPoint !== undefined)
			.map((nextPoint) => ({
				featureData: nextPoint,
				bearing: turfBearing(point, nextPoint)
			}));

		const pointLngLat = new maplibregl.LngLat(
			point.geometry.coordinates[0],
			point.geometry.coordinates[1]
		);

		angleMarkerLngLat = pointLngLat;

		nextPointData = nextPoints;
		streetViewPoint = nextPoints[0]?.featureData || point;

		isInitialStreetViewEntry = true;

		if ($mapMode === 'small') {
			mapStore.setCamera(pointLngLat);
			mapStore.panTo(point.geometry.coordinates, {
				duration: 1000,
				animate: true
			});
		}
	};

	// レイヤーエントリーをリセット
	const resetlayerEntries = () => {
		layerEntries = [];
		activeLayerIdsStore.reset();
		selectedLayerId.set('');
		mapStore.jumpToFac();
	};

	setResetLayerEntries(resetlayerEntries);

	const closeFeaturePanel = () => {
		if (!featurePanelData) return;

		if (featurePanelData.kind === 'layer-feature') {
			featureMenuData = null;
			highlightMarkerState = null;
			showSelectionMarker = false;
			return;
		}

		selectedSearchResultData = null;
		selectedSearchId = null;
		highlightMarkerState = null;
		showSelectionMarker = false;
	};

	const showModelAttributes = (picked: PickedModelFeature) => {
		const center = mapStore.getMap()?.getCenter();
		featureMenuData = {
			layerId: picked.entryId,
			featureId: picked.objectId,
			point: center ? [center.lng, center.lat] : [0, 0],
			properties: {
				オブジェクト名: picked.objectName,
				モデルID: picked.objectId,
				...picked.attributes
			},
			modelPart: picked.part
		};
	};

	const setModelViewReset = (resetView: (() => void) | null) => {
		resetModelView = resetView;
	};
	const toggleModelViewFps = () => {
		modelViewFpsMode = !modelViewFpsMode;
	};
	const setModelViewFpsMode = (enabled: boolean) => {
		modelViewFpsMode = enabled;
	};

	// streetビューの表示切り替え時
	isStreetView.subscribe(async (value) => {
		if (!streetViewPoint) return;
		isBlocked.set(true);

		showAngleMarker = value;

		const pointLngLat = new maplibregl.LngLat(
			streetViewPoint.geometry.coordinates[0],
			streetViewPoint.geometry.coordinates[1]
		);

		if (value) {
			// 初回起動時はアニメーションをスキップ

			mapStore.setCamera(pointLngLat);
			mapStore.easeTo({
				center: streetViewPoint.geometry.coordinates,
				zoom: 20,
				duration: isInitialStreetViewEntry ? 750 : 0,
				bearing: -cameraBearing + 180,
				pitch: isInitialStreetViewEntry ? 65 : 0
			});

			await delay(isInitialStreetViewEntry ? 750 : 0);

			showMapCanvas = false;
			showThreeCanvas = true;
			if (isInitialStreetViewEntry) await delay(500);

			mapStore.setBearing(0);
			mapStore.setPitch(0);
			mapStore.setZoom(18);
			$mapMode = 'small';
			isBlocked.set(false);
		} else {
			// ストリートビュー終了時
			mapStore.easeTo({
				center: streetViewPoint.geometry.coordinates,
				zoom: 20,
				duration: 0,
				bearing: -cameraBearing + 180,
				pitch: 65
			});

			$mapMode = 'view';
			showMapCanvas = true;
			showThreeCanvas = false;
			mapStore.resetCamera();

			await delay(300);

			// マップを移動
			mapStore.easeTo({
				zoom: 17,
				bearing: 0,
				pitch: 0,
				duration: 750
			});
			await delay(750);
			isBlocked.set(false);

			// const map = mapStore.getMap();
			// if (!map) return;
			// map.resize();
			// await delay(100); // 短いdelayを追加
			// map.triggerRepaint();
		}
	});

	const mergeResolvedLayerEntry = (
		currentEntry: MorivisLayerEntry,
		resolvedEntry: MorivisLayerEntry
	): MorivisLayerEntry => {
		if (currentEntry.id !== resolvedEntry.id || currentEntry.type !== resolvedEntry.type) {
			return resolvedEntry;
		}

		const currentState = 'state' in currentEntry ? currentEntry.state : undefined;
		const resolvedState = 'state' in resolvedEntry ? resolvedEntry.state : undefined;
		const mergedState =
			currentEntry.metaData.needsLazyHydration === true ? resolvedState : currentState;

		return {
			...resolvedEntry,
			style: currentEntry.style,
			interaction: currentEntry.interaction,
			...(mergedState ? { state: mergedState } : {})
		} as MorivisLayerEntry;
	};

	const replaceLayerEntry = (entryId: string, resolvedEntry: MorivisLayerEntry) => {
		if (!$activeLayerIdsStore.includes(entryId)) return;

		layerEntries = layerEntries.map((entry) => {
			if (entry.id !== entryId) return entry;
			return mergeResolvedLayerEntry(entry, resolvedEntry);
		});
	};

	const replaceShowDataEntry = (resolvedEntry: MorivisLayerEntry) => {
		if (!showDataEntry || showDataEntry.id !== resolvedEntry.id) return;
		showDataEntry = mergeResolvedLayerEntry(showDataEntry, resolvedEntry);
	};

	const pendingLazyEntryIds = new SvelteSet<string>();

	const hydrateLazyLayerEntry = (entryId: string) => {
		if (!isLazyCatalogEntry(entryId) || pendingLazyEntryIds.has(entryId)) return;

		pendingLazyEntryIds.add(entryId);
		void resolveMorivisLayerEntry(entryId)
			.then((resolvedEntry) => {
				if (!resolvedEntry) return;
				replaceLayerEntry(entryId, resolvedEntry);
			})
			.catch((error) => {
				console.error(`レイヤー ${entryId} の遅延読み込みに失敗しました`, error);
			})
			.finally(() => {
				pendingLazyEntryIds.delete(entryId);
			});
	};

	$effect(() => {
		const previewEntry = showDataEntry;
		const entryId = previewEntry?.id;
		if (!entryId || !isLazyCatalogEntry(entryId)) return;
		if (!needsLazyHydration(previewEntry)) return;

		void resolveMorivisLayerEntry(entryId)
			.then((resolvedEntry) => {
				if (!resolvedEntry) return;
				replaceShowDataEntry(resolvedEntry);
			})
			.catch((error) => {
				console.error(`プレビュー用レイヤー ${entryId} の遅延読み込みに失敗しました`, error);
			});
	});

	// レイヤーの追加、削除、並び替えを行う
	activeLayerIdsStore.subscribe((newOrderedIds) => {
		const currentLayerEntries = [...layerEntries];
		const currentLayerIds = new Set(currentLayerEntries.map((entry) => entry.id));
		const dataEntriesMap = new Map(getLayerEntriesData().map((entry) => [entry.id, entry]));

		// 現在の layerEntries をIDをキーとしたマップに変換し、既存のレイヤーオブジェクトを素早く参照できるようにする
		const currentLayersMap = new Map(currentLayerEntries.map((entry) => [entry.id, entry]));

		const newLayerEntries = []; // 新しい layerEntries の内容を格納する配列

		for (const id of newOrderedIds) {
			let layer = currentLayersMap.get(id); // 現在のマップからレイヤーを検索

			if (layer) {
				// 既存の layerEntries にそのレイヤーがあれば、そのオブジェクトをそのまま利用する
				// そのレイヤーオブジェクトに対するプロパティの変更が保持される
				newLayerEntries.push(layer);
			} else {
				// 新しく orderedLayerIds に追加されたレイヤーであれば、layerEntriesData から取得する
				layer = dataEntriesMap.get(id) ?? findCatalogEntry(id);

				if (layer) {
					// layerEntriesData から取得したオブジェクトを、初期状態として追加

					newLayerEntries.push(layer);
				}
			}
		}

		// 新しいデータで再レンダリング。
		layerEntries = newLayerEntries;

		newOrderedIds
			.filter((id) => !currentLayerIds.has(id))
			.forEach((id) => {
				hydrateLazyLayerEntry(id);
			});
	});

	const streetViewNodeId = $derived(page.url.searchParams.get('sv'));

	let currentStreetViewNodeId: string | null = null;
	// URLパラメータの変更を監視
	$effect(() => {
		if (streetViewNodeId === currentStreetViewNodeId) return;
		currentStreetViewNodeId = streetViewNodeId;
		if (!isInitialStreetViewEntry) return;
		setPoint(Number(streetViewNodeId));
	});

	const focusFeature = async (result: ResultData) => {
		if (result.type === 'poi') {
			const sourceLayerId = result.layerId.startsWith('@')
				? result.layerId.slice(1)
				: result.layerId;
			const tileCoords = lonLatToTileCoords(
				result.point[0],
				result.point[1],
				14 // ズームレベル
			);
			const prop = await getPropertiesFromPMTiles(
				`${ENTRY_PMTILES_VECTOR_PATH}/fac_search.pmtiles`,
				tileCoords,
				sourceLayerId,
				result.featureId
			);

			const data: FeatureMenuData = {
				layerId: result.layerId,
				properties: (() => {
					const layerEntry = layerEntries.find((entry) => entry.id === sourceLayerId);
					const pointLayerEntry =
						layerEntry?.type === 'vector' && layerEntry.format.geometryType === 'Point'
							? (layerEntry as PointEntry<GeoJsonMetaData | TileMetaData>)
							: null;
					const propertyImage = pointLayerEntry
						? resolvePopupImageUrl(prop, pointLayerEntry.properties)
						: null;
					const iconImage =
						propertyImage ??
						(pointLayerEntry
							? resolveGeneratedPoiIconUrl(
									prop,
									pointLayerEntry.style.imageIcon,
									pointLayerEntry.properties.images?.icon
								)
							: null);
					return prop && iconImage ? { ...prop, iconImage } : prop;
				})(),
				point: result.point,
				featureId: result.featureId
			};
			const layerEntry = layerEntries.find((entry) => entry.id === sourceLayerId);
			const pointLayerEntry =
				layerEntry?.type === 'vector' && layerEntry.format.geometryType === 'Point'
					? (layerEntry as PointEntry<GeoJsonMetaData | TileMetaData>)
					: null;
			const propertyImage = pointLayerEntry
				? resolvePopupImageUrl(prop, pointLayerEntry.properties)
				: null;
			const iconImage =
				propertyImage ??
				(pointLayerEntry
					? resolveGeneratedPoiIconUrl(
							prop,
							pointLayerEntry.style.imageIcon,
							pointLayerEntry.properties.images?.icon
						)
					: null);
			featureMenuData = data;
			highlightMarkerState = {
				type: 'poi',
				featureId: result.featureId,
				point: result.point,
				properties: prop && iconImage ? { ...prop, iconImage } : (prop ?? {}),
				iconImage
			};
			showSelectionMarker = false;
			selectedSearchResultData = result;
			if (result.id) selectedSearchId = result.id;
		} else if (result.type === 'address' || result.type === 'coordinate') {
			featureMenuData = null;
			selectedSearchResultData = result;
			highlightMarkerState = {
				type: 'search',
				result
			};
			if (result.id) selectedSearchId = result.id;
			showSelectionMarker = false;
		}

		if (result.type !== 'layer') {
			mapStore.panToOrJumpTo(new maplibregl.LngLat(result.point[0], result.point[1]));
		}
	};

	onDestroy(() => {
		// コンポーネントが破棄されるときに実行される処理
		isInitialized = false;
	});
</script>

<!-- {#if !isInitialized && !isInitialStreetViewEntry}
	<div class="bg-main absolute z-100 grid h-full w-full place-items-center">
		<div class="text-5xl">Loading&hellip;</div>
	</div>
{/if} -->

{#if isInitialized && isInitialStreetViewEntry}
	{#if isScreenshotMode}
		<!-- スクリーンショットモード: マップのみ表示 -->
		<div class="fixed h-dvh w-full">
			<MapLibreMap
				bind:maplibreMap={map}
				bind:layerEntries
				bind:tempLayerEntries
				bind:showDataEntry
				bind:featureMenuData
				bind:highlightMarkerState
				bind:showSelectionMarker
				bind:selectionMarkerLngLat
				bind:showAngleMarker
				bind:angleMarkerLngLat
				bind:cameraBearing
				bind:dropFile
				bind:showDialogType
				bind:drawGeojsonData
				{transformOptionMode}
				bind:focusBbox
				bind:isExternalCameraUpdate
				bind:selectedSearchId
				bind:selectedSearchResultData
				bind:contextMenuState
				bind:isDragover
				{geoRefPreviewData}
				previewOpacity={geoRefPreviewOpacity}
				{searchResults}
				{selectedEpsgCode}
				{zoneBboxGeojsonData}
				{streetViewLineData}
				{streetViewPointData}
				{showMapCanvas}
				{searchGeojsonData}
				{focusFeature}
			/>
		</div>
	{:else}
		<div class="fixed flex h-dvh w-full flex-col">
			<div class="flex h-full w-full flex-1">
				<!-- マップのオフセット調整用 -->
				{#if $showLayerMenu}
					<div
						in:slide={{ duration: 1, delay: 200, axis: 'x' }}
						class="bg-main w-side-menu flex h-full shrink-0 flex-col max-lg:hidden"
					></div>
				{/if}

				<LayerMenu
					bind:layerEntries
					bind:tempLayerEntries
					bind:showDataEntry
					bind:featureMenuData
				/>

				<!-- 左側余白 -->
				{#if !$showLayerMenu}
					<div class="bg-main p-2 max-lg:hidden"></div>
				{/if}

				<!-- スマホ用その他メニュー -->
				<div
					class="absolute z-10 h-full w-full lg:hidden {$showOtherMenu
						? 'pointer-events-auto opacity-500'
						: 'pointer-events-none opacity-0'}"
				>
					<OtherMenu bind:imagePreviewUrl bind:imageBounds />
				</div>

				<!-- <DrawMenu bind:layerEntries bind:drawGeojsonData /> -->
				<div class="flex w-full flex-1 flex-col overflow-hidden">
					<!-- 上部余白 -->
					<!-- <div class="bg-main w-full p-2 max-lg:hidden"></div> -->
					<HeaderMenu
						{layerEntries}
						bind:inputSearchWord
						bind:featureMenuData
						bind:selectedSearchResultData
						bind:searchResults
						bind:showSelectionMarker
						bind:selectionMarkerLngLat
						bind:showDataEntry
						{focusFeature}
						hideControls={$showModelView}
						onResetModelView={resetModelView ?? undefined}
						{modelViewFpsMode}
						onToggleModelViewFps={toggleModelViewFps}
					/>

					<div class="min-h-0 flex-1">
						<MapLibreMap
							bind:maplibreMap={map}
							bind:layerEntries
							bind:tempLayerEntries
							bind:showDataEntry
							bind:featureMenuData
							bind:highlightMarkerState
							bind:showSelectionMarker
							bind:selectionMarkerLngLat
							bind:showAngleMarker
							bind:angleMarkerLngLat
							bind:cameraBearing
							bind:dropFile
							bind:showDialogType
							bind:drawGeojsonData
							{transformOptionMode}
							bind:focusBbox
							bind:isExternalCameraUpdate
							bind:selectedSearchId
							bind:selectedSearchResultData
							bind:contextMenuState
							bind:isDragover
							{geoRefPreviewData}
							previewOpacity={geoRefPreviewOpacity}
							{searchResults}
							{selectedEpsgCode}
							{zoneBboxGeojsonData}
							{streetViewLineData}
							{streetViewPointData}
							{showMapCanvas}
							{searchGeojsonData}
							{focusFeature}
						/>
					</div>
				</div>
				<!-- 右側余白 -->
				<div class="bg-main p-2 max-lg:hidden"></div>
			</div>

			<!-- フッター -->
			<Footer />

			<LayerStyleMenu bind:layerEntry={isStyleEditEntry} bind:tempLayerEntries />

			<SearchMenu
				bind:featureMenuData
				bind:inputSearchWord
				bind:showSelectionMarker
				bind:selectionMarkerLngLat
				bind:searchResults
				bind:searchGeojsonData
				{selectedSearchId}
				{focusFeature}
			/>
			{#if featurePanelData}
				<FeaturePanel
					panelData={featurePanelData}
					{layerEntries}
					bind:showSelectionMarker
					onClose={closeFeaturePanel}
				/>
			{/if}

			<!-- スマホ用地物情報 -->
			<MobileFeatureMenuCard bind:featureMenuData {layerEntries} bind:showSelectionMarker>
				{#await mobileLayerFeatureSummaryPromise}
					<FeaturePanelLoading
						containerClass="flex w-full flex-col items-center justify-center gap-4 px-4 py-8"
					/>
				{:then summary}
					<FeaturePanelLayerContent
						bind:featureMenuData
						{layerEntries}
						bind:showSelectionMarker
						showSummaryTab={summary ? hasFeaturePanelSummaryContent(summary) : false}
						hasAttributeTab={mobileHasAttributeTab}
						resetKey={mobileFeaturePanelResetKey}
						{summary}
					/>
				{/await}
			</MobileFeatureMenuCard>

			{#if !isModelPlacementActive}
				<PreviewMenu bind:showDataEntry />
			{/if}

			{#if !transformOptionMode}
				<DataMenu
					bind:showDataEntry
					bind:dropFile
					bind:showDialogType
					bind:remoteGeoZarrUrl
					bind:remotePmtilesUrl
					bind:remoteRasterUrl
					bind:remoteVectorUrl
					bind:remoteTiles3dUrl
					bind:remoteWmtsUrl
					bind:remoteFeatureServiceUrl
					bind:pendingTileUrl
				/>
			{/if}
			{#if showDataEntry && !isModelPlacementActive}
				<DataPreviewDialog bind:showDataEntry bind:tempLayerEntries />
			{/if}

			{#if showStreetViewLayer}
				<StreetViewCanvas
					{streetViewPoint}
					{nextPointData}
					{showThreeCanvas}
					bind:cameraBearing
					bind:showAngleMarker
					bind:isExternalCameraUpdate
				/>
			{/if}

			{#if modelViewEntries.length > 0}
				{#key $modelViewRequest?.entryIds.join(':')}
					<ModelViewCanvas
						entries={modelViewEntries}
						initialCamera={$modelViewRequest?.camera}
						includeHighlights={$modelViewRequest?.includeHighlights ?? false}
						fpsMode={modelViewFpsMode}
						onModelPicked={showModelAttributes}
						onResetViewChange={setModelViewReset}
						onFpsModeChange={setModelViewFpsMode}
					/>
				{/key}
			{/if}

			{#if !$isStreetView && !showDataEntry}
				<!-- スマホ用地図コントロール -->
				<MobileMapControl />
			{/if}

			<MobileFooter {showDataEntry} {featureMenuData} />
		</div>
	{/if}
{/if}
{#if UploadDialog}
	<UploadDialog
		{map}
		bind:showDialogType
		bind:showDataEntry
		bind:tempLayerEntries
		bind:dropFile
		bind:remoteGeoZarrUrl
		bind:remotePmtilesUrl
		bind:remoteRasterUrl
		bind:remoteVectorUrl
		bind:remoteTiles3dUrl
		bind:remoteWmtsUrl
		bind:remoteFeatureServiceUrl
		bind:pendingTileUrl
		bind:transformOptionMode
		bind:focusBbox
		bind:isDragover
		bind:zoneConfirmedEpsg
		bind:pendingZoneGeoRefData
		bind:geoRefData
		{selectedEpsgCode}
	/>
{/if}

<ImagePreviewDialog bind:imagePreviewUrl bind:imageBounds />

{#if map && transformOptionMode && GeoRefForm}
	<GeoRefForm
		{map}
		{allowedTransformModes}
		bind:selectedEpsgCode
		bind:focusBbox
		bind:zoneBboxGeojsonData
		bind:geoRefData
		bind:geoRefPreviewData
		bind:previewOpacity={geoRefPreviewOpacity}
		bind:showDialogType
		bind:showDataEntry
		bind:dropFile
		bind:transformOptionMode
		onZoneConfirm={(epsgCode: EpsgCode) => {
			geoRefData = null;
			geoRefPreviewData = null;
			geoRefPreviewOpacity = 0.6;
			transformOptionMode = null;
			zoneConfirmedEpsg = epsgCode;
			debugLog.info(`Zone確定: epsg=${epsgCode}`);
		}}
		onZoneGeoRef={(epsgCode: EpsgCode) => {
			geoRefPreviewData = null;
			geoRefPreviewOpacity = 0.6;
			selectedEpsgCode = epsgCode;
			transformOptionMode = 'georef';
			debugLog.info(`GeoRef切替: epsg=${epsgCode}`);
		}}
		onGeoRefConfirm={(payload: GeoRefConfirmPayload) => {
			debugLog.info(`GeoRef確定値受信: bbox=${payload.bbox.join(',')}`);
			return finalizeGeoRefEntry(payload);
		}}
	/>
{/if}

{#if contextMenuState}
	<ContextMenu bind:contextMenuState />
{/if}
<Tooltip />

<!-- PC用その他メニュー -->
<div class="max-lg:hidden">
	<OtherMenu bind:imagePreviewUrl bind:imageBounds />
</div>
<NotificationMessage />

<Processing />
<ConfirmationDialog />
<MobileDebugLogger />

<!-- TODO -->
<svelte:window
	onkeydown={(e) => {
		if (e.key === 'F3') {
			isDebugMode.set(!$isDebugMode);
		}

		if (e.key === 'Escape') {
			// フォーカスを外す処理を追加
			if (document.activeElement && document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}

			if (featurePanelData) {
				closeFeaturePanel();
				return;
			}

			if (showDataEntry) {
				showDataEntry = null;
				return;
			}
			if (isStyleEditEntry) {
				isStyleEditEntry = null;
				selectedLayerId.set('');
				isStyleEdit.set(false);
				return;
			}

			if ($showDataMenu) {
				showDataMenu.set(false);
				return;
			}

			if ($isStreetView) {
				isStreetView.set(false);
				return;
			}

			if ($showOtherMenu) {
				showOtherMenu.set(false);
				return;
			}

			if ($showInfoDialog) {
				showInfoDialog.set(false);
				return;
			}

			if ($showTermsDialog) {
				showTermsDialog.set(false);
				return;
			}

			if ($showSearchMenu) {
				showSearchMenu.set(false);
				return;
			}
		}
	}}
/>

<style>
</style>
