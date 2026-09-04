<script lang="ts">
	import { clickDebug } from './map-debug';

	import { ICON_IMAGE_BASE_PATH } from '$routes/constants';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { ZoomLevel } from '$routes/map/data/types/raster';
	import type { PointEntry, GeoJsonMetaData, TileMetaData } from '$routes/map/data/types/vector';
	import type { FeatureMenuData, HighlightMarkerState } from '$routes/map/types';
	import type { StreetViewPointGeoJson } from '$routes/map/types/street-view';
	import type { ContextMenuState } from '$routes/map/types/ui';
	import type { ResultData } from '$routes/map/utils/data/search-result';
	import { mapGeoJSONFeatureToSidePopupData } from '$routes/map/utils/formats/geojson';
	import {
		isGeneratedPoiIconLayout,
		resolveGeneratedPoiIconUrl,
		resolvePopupImageUrl
	} from '$routes/map/utils/icon';
	import {
		getLogicalLayerIdFromLayer,
		HighlightLayerRegistry
	} from '$routes/map/utils/layers/highlight';
	import { getMorivisLayerRole } from '$routes/map/utils/layers/id';
	import { isPointInBbox } from '$routes/map/utils/map/bbox';
	import type { LngLat, MapMouseEvent, MapGeoJSONFeature } from '$routes/map/utils/maplibre';
	import maplibregl from '$routes/map/utils/maplibre';
	import { setStreetViewParams } from '$routes/map/utils/platform/url-params';
	import { checkMobile } from '$routes/map/utils/platform/viewport';
	import { getPixelColor, getGuide } from '$routes/map/utils/raster/tile-query';
	import { threeJsManager } from '$routes/map/utils/three/layer-manager';
	import {
		clickableVectorIds,
		clickableRasterIds,
		selectedHighlightData,
		type SelectedHighlightData
	} from '$routes/stores';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		markerLngLat: maplibregl.LngLat | null;
		streetViewPointData: StreetViewPointGeoJson;
		showMarker: boolean;
		clickedLayerIds: string[];
		featureMenuData: FeatureMenuData | null;
		highlightMarkerState: HighlightMarkerState | null;
		layerEntries: MorivisLayerEntry[];
		showDataEntry: MorivisLayerEntry | null;
		cameraBearing: number;
		isExternalCameraUpdate: boolean;
		selectedSearchId: number | null;
		selectedSearchResultData: ResultData | null;
		searchResults: ResultData[] | null;
		focusFeature: (result: ResultData) => void;
		toggleTooltip: (e?: MapMouseEvent, feature?: MapGeoJSONFeature) => void;
		contextMenuState: ContextMenuState | null;
	}

	let {
		markerLngLat = $bindable(),
		featureMenuData = $bindable(),
		highlightMarkerState = $bindable(),
		showMarker = $bindable(),
		clickedLayerIds = $bindable(),
		streetViewPointData,
		layerEntries,
		showDataEntry,
		cameraBearing = $bindable(),
		isExternalCameraUpdate = $bindable(),
		selectedSearchId = $bindable(),
		selectedSearchResultData = $bindable(),
		searchResults,
		focusFeature,
		toggleTooltip,
		contextMenuState = $bindable()
	}: Props = $props();

	const ADDITIONAL_CLICKABLE_LAYER_IDS = ['@poi_top', '@search_result'] as const;
	const HIT_TOLERANCE_BY_GEOMETRY = {
		Point: 4,
		LineString: 8,
		Polygon: 6
	} as const;
	let highlightedGeneratedPoiLayerId: string | null = $state(null);

	const clearSearchHighlight = () => {
		// 検索起点の選択状態だけを解除し、POI選択のハイライトは残す。
		selectedSearchId = null;
		selectedSearchResultData = null;
		if (highlightMarkerState?.type === 'search') {
			highlightMarkerState = null;
		}
	};

	const clearContextMenuMarker = () => {
		// 空白クリックで出したマーカーとコンテキストメニューをまとめて閉じる。
		contextMenuState = null;
		markerLngLat = null;
		showMarker = false;
	};

	const openContextMenuMarker = (e: MapMouseEvent) => {
		// 空白地点を操作対象として記録し、PCではその場にコンテキストメニューを開く。
		showMarker = true;
		markerLngLat = e.lngLat;

		if (checkMobile()) return;

		contextMenuState = {
			show: true,
			x: e.originalEvent.clientX,
			y: e.originalEvent.clientY,
			lngLat: e.lngLat
		};
	};

	const getClickableTargetLayerIds = () => {
		// クリック対象になりうるレイヤーIDを集め、ハイライト表示専用レイヤーは除外する。
		return [...$clickableVectorIds, ...ADDITIONAL_CLICKABLE_LAYER_IDS].filter((layerId) => {
			return !layerId.startsWith('@highlight_');
		});
	};

	const getExistingClickableLayerIds = () => {
		// 現在のスタイルに存在するレイヤーだけに絞り、queryRenderedFeatures の対象を安定させる。
		return getClickableTargetLayerIds().filter((layerId) => {
			return mapStore.getLayer(layerId) !== undefined;
		});
	};

	const getHitQueryBox = (
		point: MapMouseEvent['point'],
		layerIds: string[],
		layerHints: MorivisLayerEntry[]
	): [[number, number], [number, number]] => {
		// 点1発の queryRenderedFeatures だと、細かく分割された MultiPolygon や細線を取りこぼす。
		// クリック周辺を小さい矩形で問い合わせて、見た目に対するヒット率を安定させる。
		const tolerances = layerIds
			.map((layerId) => {
				const entry = layerHints.find((item) => item.id === layerId);
				if (!entry || entry.type !== 'vector') return HIT_TOLERANCE_BY_GEOMETRY.Polygon;
				return HIT_TOLERANCE_BY_GEOMETRY[entry.format.geometryType];
			})
			.filter((value) => Number.isFinite(value));
		const tolerance =
			tolerances.length > 0 ? Math.max(...tolerances) : HIT_TOLERANCE_BY_GEOMETRY.Polygon;

		return [
			[point.x - tolerance, point.y - tolerance],
			[point.x + tolerance, point.y + tolerance]
		];
	};

	const getSelectedRasterLayerIds = (lngLat: LngLat) => {
		return layerEntries
			.filter((entry) => {
				if (entry.type === 'raster' && entry.interaction.clickable && entry.style.visible) {
					if (entry.metaData.location === '全国') {
						return true;
					} else if (isPointInBbox(lngLat, entry.metaData.bounds)) {
						return true;
					}
				}
			})
			.map((entry) => entry.id);
	};

	const resetDefaultHighlight = () => {
		HighlightLayerRegistry.getFilterUpdates(null).forEach(({ layerId, filter }) => {
			if (!mapStore.getLayer(layerId)) return;
			mapStore.setFilter(layerId, filter);
		});
		HighlightLayerRegistry.syncPatternAnimation(mapStore.getMap(), null);
	};

	const resetGeneratedPoiHighlight = () => {
		const map = mapStore.getMap();
		if (!map || !highlightedGeneratedPoiLayerId) return;
		if (!mapStore.getLayer(highlightedGeneratedPoiLayerId)) return;
		const pointLayerEntry = getPointLayerEntry(highlightedGeneratedPoiLayerId);
		map.setPaintProperty(
			highlightedGeneratedPoiLayerId,
			'icon-opacity',
			pointLayerEntry?.style.opacity ?? 1
		);
		highlightedGeneratedPoiLayerId = null;
	};

	const hideSelectedGeneratedPoiSymbol = (layerId: string, featureId: string | number) => {
		const map = mapStore.getMap();
		if (!map || !mapStore.getLayer(layerId)) return;
		highlightedGeneratedPoiLayerId = layerId;
		const pointLayerEntry = getPointLayerEntry(layerId);
		const baseOpacity = pointLayerEntry?.style.opacity ?? 1;
		map.setPaintProperty(layerId, 'icon-opacity', [
			'case',
			['==', ['id'], featureId],
			0,
			baseOpacity
		]);
	};

	const isGeneratedPoiIconFeature = (layerId: string) => {
		const map = mapStore.getMap();
		const layer = mapStore.getLayer(layerId);
		if (!map || !layer || layer.type !== 'symbol') return false;

		const iconImage = map.getLayoutProperty(layerId, 'icon-image');
		return isGeneratedPoiIconLayout(iconImage);
	};

	const applyDefaultHighlight = (selected: SelectedHighlightData | null) => {
		HighlightLayerRegistry.getFilterUpdates(selected).forEach(({ layerId, filter }) => {
			if (!mapStore.getLayer(layerId)) return;
			mapStore.setFilter(layerId, filter);
		});
		HighlightLayerRegistry.syncPatternAnimation(mapStore.getMap(), selected);
	};

	const getPointLayerEntry = (layerId: string) => {
		const layerEntry = layerEntries.find((entry) => entry.id === layerId);
		return layerEntry?.type === 'vector' && layerEntry.format.geometryType === 'Point'
			? (layerEntry as PointEntry<GeoJsonMetaData | TileMetaData>)
			: null;
	};

	const resolvePoiHighlightProperties = (
		layerId: string,
		feature: MapGeoJSONFeature
	): { [key: string]: any } => {
		const pointLayerEntry = getPointLayerEntry(layerId);
		const generatedIconImage = pointLayerEntry
			? resolveGeneratedPoiIconUrl(
					feature.properties,
					pointLayerEntry.style.imageIcon,
					pointLayerEntry.properties.images?.icon
				)
			: null;
		const popupImage = pointLayerEntry
			? resolvePopupImageUrl(feature.properties, pointLayerEntry.properties)
			: null;
		const iconImage = generatedIconImage ?? popupImage;

		return feature.properties && iconImage
			? {
					...feature.properties,
					iconImage
				}
			: (feature.properties ?? {});
	};

	// アイコン差し替えと専用マーカーでPOIを強調表示する。通常のハイライトは使わない。
	const applyGeneratedPoiHighlight = (
		selected: SelectedHighlightData,
		feature: MapGeoJSONFeature,
		point: [number, number]
	): boolean => {
		selectedHighlightData.set(selected);
		resetDefaultHighlight();
		highlightedGeneratedPoiLayerId = selected.layerId;
		const resolvedProperties = resolvePoiHighlightProperties(selected.layerId, feature);
		const iconImage =
			typeof resolvedProperties.iconImage === 'string' ? resolvedProperties.iconImage : null;
		if (!iconImage) {
			resetGeneratedPoiHighlight();
			return false;
		}

		featureMenuData = {
			layerId: selected.layerId,
			featureId: selected.featureId,
			properties: resolvedProperties,
			point
		};
		highlightMarkerState = {
			type: 'poi',
			featureId: selected.featureId,
			properties: resolvedProperties,
			point,
			iconImage
		};

		mapStore.panToPoi(new maplibregl.LngLat(point[0], point[1]));
		return true;
	};

	const clearHighlightOnly = () => {
		selectedHighlightData.set(null);
		resetGeneratedPoiHighlight();
		if (highlightMarkerState?.type === 'poi') {
			highlightMarkerState = null;
		}
		applyDefaultHighlight(null);
	};

	const showSelectionMarkerFallback = (point: [number, number]) => {
		clearHighlightOnly();
		markerLngLat = new maplibregl.LngLat(point[0], point[1]);
		showMarker = true;
	};

	const setSelectedHighlight = (
		selected: SelectedHighlightData | null,
		options?: {
			feature?: MapGeoJSONFeature;
			point?: [number, number];
		}
	) => {
		// 選択中の地物IDを共通ストアへ反映し、各ハイライト表示の起点にする。
		selectedHighlightData.set(selected);

		if (!selected) {
			// 選択解除時は、POI用の見た目と補助UIをまとめて初期化する。
			if (highlightMarkerState?.type === 'poi') {
				highlightMarkerState = null;
			}
			resetGeneratedPoiHighlight();
			markerLngLat = null;
			showMarker = false;
			applyDefaultHighlight(null);
			return;
		}

		if (options?.feature && options.point && isGeneratedPoiIconFeature(selected.layerId)) {
			// 生成アイコンPOIは通常ハイライトではなく、アイコン差し替えと専用マーカーで強調する。
			const didHighlight = applyGeneratedPoiHighlight(selected, options.feature, options.point);
			if (!didHighlight) {
				showSelectionMarkerFallback(options.point);
			}
			return;
		}

		// それ以外の地物は、生成アイコン用の状態を片付けて通常ハイライトへ戻す。
		resetGeneratedPoiHighlight();
		if (highlightMarkerState?.type === 'poi') {
			highlightMarkerState = null;
		}

		applyDefaultHighlight(selected);
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

				// TODO: ラステーの凡例ポップアップ表示
			}
		}
	};

	// 地物がない場所をクリックしたときの処理。ハイライトやコンテキストメニューをクリアし、条件によっては新たにコンテキストメニューを開く。
	const handleBlankMapClick = (e: MapMouseEvent) => {
		// まず既存の選択状態を片付け、何も選択されていないときだけ空白地点の操作を開く。
		const hadHighlight =
			$selectedHighlightData !== null ||
			featureMenuData !== null ||
			highlightMarkerState !== null ||
			selectedSearchResultData !== null;
		const hadMarker = markerLngLat !== null;
		const hadContextMenu = contextMenuState?.show === true;

		setSelectedHighlight(null);
		threeJsManager.clearModelHighlight();
		featureMenuData = null;
		clearSearchHighlight();
		clickedLayerIds = [];

		if (hadContextMenu || hadHighlight || hadMarker) {
			clearContextMenuMarker();
			return;
		}

		openContextMenuMarker(e);
	};

	// ストリートビューポイントのクリックイベント
	const handleStreetViewCircleClick = (e: MapMouseEvent) => {
		setSelectedHighlight(null);
		const features = mapStore.queryRenderedFeatures(e.point, {
			layers: ['@street_view_circle_layer']
		});

		if (features.length > 0 && streetViewPointData.features.length > 0) {
			const feature = features[0];
			const nodeId = feature.properties.node_id;

			setStreetViewParams(nodeId);
		}
	};

	// ストリートビューのラインをクリックしたとき、クリック位置に最も近いライン上の点を特定し、その点に対応するノードIDをもとにストリートビューへ遷移する
	const handleStreetViewLineClick = (e: MapMouseEvent) => {
		setSelectedHighlight(null);
		const features = mapStore.queryRenderedFeatures(e.point, {
			layers: ['@street_view_line_layer']
		});

		if (!features.length) return;

		const feature = features[0];
		const lineCoordinates =
			feature.geometry.type === 'LineString' ? feature.geometry.coordinates : [];

		let closestPoint: [number, number] | null = null;
		let minDistance = Infinity;

		for (const coord of lineCoordinates) {
			const distance = Math.sqrt(
				Math.pow(coord[0] - e.lngLat.lng, 2) + Math.pow(coord[1] - e.lngLat.lat, 2)
			);
			if (distance < minDistance) {
				minDistance = distance;
				closestPoint = coord as [number, number];
			}
		}

		if (!closestPoint) return;

		const first = lineCoordinates[0];
		const last = lineCoordinates[lineCoordinates.length - 1];
		const isFirst = closestPoint[0] === first[0] && closestPoint[1] === first[1];
		const isLast = closestPoint[0] === last[0] && closestPoint[1] === last[1];

		const nodeId = isFirst
			? feature.properties.source
			: isLast
				? feature.properties.target
				: feature.properties.source;

		setStreetViewParams(nodeId);
	};

	// 検索結果の地物をクリックしたときの処理
	const handleSearchResultClick = (e: MapMouseEvent) => {
		const searchFeatures = mapStore.queryRenderedFeatures(e.point, {
			layers: ['@search_result']
		});

		if (!searchFeatures.length) return false;

		setSelectedHighlight(null);
		const { properties } = searchFeatures[0];
		const result = searchResults?.find((result) => result.id === properties.id);
		if (result) focusFeature(result);
		return true;
	};

	// 補助レイヤーの地物をクリックしたときの処理。、そのレイヤーに対応するエントリーを探し、必要に応じてズームインする。
	const handleAuxiliaryLayerClick = (feature: MapGeoJSONFeature, lngLat: LngLat) => {
		if (getMorivisLayerRole(feature.layer.metadata) !== 'auxiliary') return false;

		const logicalLayerId = getLogicalLayerIdFromLayer(feature.layer);
		const targetEntry = layerEntries.find((entry) => entry.id === logicalLayerId);
		if (!targetEntry) return false;

		const targetZoom = targetEntry.metaData.minZoom + 0.5;
		const currentZoom = mapStore.getMap()?.getZoom();

		setSelectedHighlight(null);
		featureMenuData = null;
		clearSearchHighlight();
		clickedLayerIds = [logicalLayerId];

		// circleまたはsymbolの補助レイヤーは、その座標値
		if (feature.layer.type === 'circle' || feature.layer.type === 'symbol') {
			lngLat = new maplibregl.LngLat(
				(feature.geometry as any).coordinates[0],
				(feature.geometry as any).coordinates[1]
			);
		}

		if (currentZoom === undefined || currentZoom < targetZoom) {
			mapStore.flyTo(lngLat, { zoom: targetZoom, duration: 1000 });
		}

		return true;
	};

	mapStore.onClick(async (e: MapMouseEvent) => {
		showMarker = false;
		// プレブュー中はクリック処理を行わない
		if (showDataEntry) return;
		try {
			// デバッグ用コード
			clickDebug(e);

			const pickedModel = await threeJsManager.pickModel(e.point);
			if (pickedModel) {
				console.info('[モデル属性]', pickedModel);
				clearSearchHighlight();
				clickedLayerIds = [pickedModel.entryId];
				featureMenuData = {
					layerId: pickedModel.entryId,
					featureId: pickedModel.objectId,
					point: [e.lngLat.lng, e.lngLat.lat],
					properties: {
						オブジェクト名: pickedModel.objectName,
						モデルID: pickedModel.objectId,
						...pickedModel.attributes
					},
					modelPart: pickedModel.part
				};
				setSelectedHighlight(null);
				return;
			}
			if (!import.meta.env.PROD) console.info('[モデル属性] メッシュにヒットしませんでした');
			threeJsManager.clearModelHighlight();

			const existingLayerIds = getExistingClickableLayerIds();
			if (!existingLayerIds.length) return;
			const hitQueryBox = getHitQueryBox(e.point, existingLayerIds, layerEntries);

			const features = mapStore.queryRenderedFeatures(hitQueryBox, {
				layers: existingLayerIds
			});

			if (!features.length) {
				handleBlankMapClick(e);
				return;
			}

			const selectedVecterLayersId = features.map((feature) =>
				getLogicalLayerIdFromLayer(feature.layer)
			);
			const selectedRasterLayersId = getSelectedRasterLayerIds(e.lngLat);

			// ストリートビューに切り返る
			if (selectedVecterLayersId.includes('@street_view_circle_layer')) {
				handleStreetViewCircleClick(e);
				return;
			}

			// ストリートビューに切り返る
			if (selectedVecterLayersId.includes('@street_view_line_layer')) {
				handleStreetViewLineClick(e);
				return;
			}

			// 検索結果の地物クリック処理
			if (handleSearchResultClick(e)) {
				return;
			}

			if (handleAuxiliaryLayerClick(features[0], e.lngLat)) {
				return;
			}

			// 通常の地物クリック処理
			const selectedLayerIds = [...selectedVecterLayersId, ...selectedRasterLayersId];
			clearSearchHighlight();
			clickedLayerIds = selectedLayerIds.length > 0 ? selectedLayerIds : [];

			let clickLngLat: [number, number] | null = null;

			if (features.length > 0) {
				const feature = features[0];
				const normalizedLayerId = getLogicalLayerIdFromLayer(feature.layer);
				clickLngLat =
					feature.geometry.type === 'Point'
						? (feature.geometry.coordinates as [number, number])
						: [e.lngLat.lng, e.lngLat.lat];

				const geojsonFeature = mapGeoJSONFeatureToSidePopupData(
					feature,
					clickLngLat as [number, number],
					normalizedLayerId
				);

				featureMenuData = geojsonFeature;

				// mapStore.panTo(e.lngLat, {
				// 	duration: 1000
				// });
			}
			// 検索マーカー

			const feature = features[0]; // 一番上のfeature
			const id = feature.id;
			const normalizedLayerId = getLogicalLayerIdFromLayer(feature.layer);

			// markerLngLat = clickLngLat ? new maplibregl.LngLat(...clickLngLat) : null;
			// showMarker = true;

			const selectedHighlight =
				id !== undefined && id !== null
					? {
							layerId: normalizedLayerId,
							featureId: id
						}
					: null;
			const highlightOptions =
				clickLngLat !== null
					? {
							feature,
							point: clickLngLat
						}
					: undefined;

			if (!selectedHighlight && clickLngLat) {
				showSelectionMarkerFallback(clickLngLat);
				return;
			}

			setSelectedHighlight(selectedHighlight, highlightOptions);
		} catch (error) {
			console.error('Error occurred while processing mouse events:', error);
		}
	});

	mapStore.onContextMenu(async (e: MapMouseEvent) => {
		// ウィンドウの座標を取得
		const windowX = e.originalEvent.clientX;
		const windowY = e.originalEvent.clientY;

		contextMenuState = {
			show: true,
			x: windowX,
			y: windowY,
			lngLat: e.lngLat
		};

		markerLngLat = e.lngLat;
		showMarker = true;
	});

	let isDragging = false;

	mapStore.onMoveStart(() => {
		isDragging = true;
		mapStore.setCursor('move');
	});

	mapStore.onMoveEnd(() => {
		isDragging = false;
		mapStore.setCursor('');
	});

	// NOTE: 初期読み込み時のエラーを防ぐため、レイヤーが読み込まれるまで待つ
	mapStore.onMousemove((e) => {
		if (isDragging) return;

		const clickLayerIds = getClickableTargetLayerIds();
		const existingLayerIds = clickLayerIds.filter((layerId) => {
			return mapStore.getLayer(layerId) !== undefined;
		});
		const features = mapStore.queryRenderedFeatures(e.point, {
			layers: existingLayerIds
		});

		if (features.length > 0) {
			mapStore.setCursor('pointer');
		} else {
			mapStore.setCursor('');
		}
	});

	// // マウスカーソルの変更
	// const mouseEnterListener = (e: MapLayerMouseEvent) => {
	// 	if (!e.features || e.features.length === 0) return;

	// 	map.getCanvas().style.cursor = 'pointer';
	// };
	// const mouseLeaveListener = (e: MapLayerMouseEvent) => {
	// 	map.getCanvas().style.cursor = '';
	// };

	// clickableVectorIds.subscribe((layers) => {
	// 	if (layers.length === 0) return;

	// 	if (currentLayerIds.length > 0) {
	// 		currentLayerIds.forEach((layerId) => {
	// 			map.off('mouseenter', layerId, mouseEnterListener);
	// 			map.off('mouseleave', layerId, mouseLeaveListener);
	// 		});
	// 	}

	// 	currentLayerIds = layers;

	// 	layers.forEach((layerId) => {
	// 		map.on('mouseenter', layerId, mouseEnterListener);
	// 		map.on('mouseleave', layerId, mouseLeaveListener);
	// 	});
	// });

	$effect(() => {
		if (highlightMarkerState?.type === 'poi' && highlightedGeneratedPoiLayerId) {
			hideSelectedGeneratedPoiSymbol(
				highlightedGeneratedPoiLayerId,
				highlightMarkerState.featureId
			);
			return;
		}

		resetGeneratedPoiHighlight();
	});

	$effect(() => {
		if (!featureMenuData) {
			setSelectedHighlight(null);
			threeJsManager.clearModelHighlight();
		}
	});
</script>

<div></div>

<style>
</style>
