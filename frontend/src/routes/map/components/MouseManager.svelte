<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type { LngLat, MapMouseEvent, Popup, MapGeoJSONFeature } from 'maplibre-gl';

	import { mount } from 'svelte';

	import LegendPopup from '$routes/map/components/popup/LegendPopup.svelte';
	import TablePopup from '$routes/map/components/popup/TablePopup.svelte';
	import { MAPLIBRE_POPUP_OPTIONS } from '$routes/constants';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { CategoryLegend, GradientLegend, ZoomLevel } from '$routes/map/data/types/raster';
	import {
		isStreetView,
		clickableVectorIds,
		clickableRasterIds,
		isStyleEdit
	} from '$routes/stores';

	import { selectedLayerId } from '$routes/stores';
	import { mapStore } from '$routes/stores/map';
	import { FeatureStateManager, type FeatureStateData } from '$routes/map/utils/feature_state';
	import { mapGeoJSONFeatureToSidePopupData } from '$routes/map/utils/file/geojson';
	import { isPointInBbox } from '$routes/map/utils/map';
	import { getPixelColor, getGuide } from '$routes/map/utils/raster';
	import type { StreetViewPointGeoJson } from '$routes/map/types/street-view';
	import type { FeatureMenuData } from '$routes/map/types';

	import { setStreetViewParams } from '../utils/params';
	import type { ResultAddressData, ResultData, ResultPoiData } from '../utils/feature';
	import type { ContextMenuState } from '$routes/map/types/ui';

	interface Props {
		markerLngLat: maplibregl.LngLat | null;
		streetViewPointData: StreetViewPointGeoJson;
		showMarker: boolean;
		clickedLayerIds: string[];
		featureMenuData: FeatureMenuData | null;
		layerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
		toggleTooltip: (e?: MapMouseEvent, feature?: MapGeoJSONFeature) => void;
		cameraBearing: number;
		isExternalCameraUpdate: boolean;
		searchResults: ResultData[] | null;
		focusFeature: (result: ResultPoiData | ResultAddressData) => void;
		contextMenuState: ContextMenuState | null;
	}

	let {
		markerLngLat = $bindable(),
		featureMenuData = $bindable(),
		showMarker = $bindable(),
		clickedLayerIds = $bindable(),
		streetViewPointData,
		layerEntries,
		showDataEntry,
		toggleTooltip,
		cameraBearing = $bindable(),
		isExternalCameraUpdate = $bindable(),
		searchResults,
		focusFeature,
		contextMenuState = $bindable()
	}: Props = $props();
	let currentLayerIds: string[] = [];
	let hoveredId: number | null = null;
	let hoveredFeatureState: FeatureStateData | null = null;
	let maplibrePopup = $state<Popup | null>(null); // ポップアップ

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

	mapStore.onClick(async (e: MapMouseEvent) => {
		// プレブュー中はクリック処理を行わない
		if (showDataEntry) return;
		try {
			// デバッグ用コード
			if (import.meta.env.DEV) {
				const features = mapStore.queryRenderedFeatures(e.point);

				if (features.length) {
					console.log('debug:Clicked features:', features);

					const prop = features[0].properties;

					// keyを配列で取得
					const keys = Object.keys(prop);
					console.log(keys);

					// expressions配列を作成
					const expressions = keys.map((key) => {
						return {
							key: key,
							name: key,
							value: `{${key}}`
						};
					});

					console.log(expressions);

					if (features[0].layer.id === '@tile_index_layer') {
						const xyz = {
							x: prop.x,
							y: prop.y,
							z: prop.z
						};

						console.log(xyz);

						//クリップボードにコピー
					}
				}
			}

			const clickLayerIds = [...$clickableVectorIds, '@search_result'];
			// 存在するレイヤーIDのみをフィルタリング
			const existingLayerIds = clickLayerIds.filter((layerId) => {
				return mapStore.getLayer(layerId) !== undefined;
			});

			if (!existingLayerIds.length) return;

			const features = mapStore.queryRenderedFeatures(e.point, {
				layers: existingLayerIds
			});

			if (!features.length) {
				if (hoveredId !== null && hoveredFeatureState !== null) {
					mapStore.setFeatureState(
						{
							...hoveredFeatureState,
							id: hoveredId
						},
						{ selected: false }
					);
					hoveredId = null;
				}

				featureMenuData = null;
				clickedLayerIds = [];

				if (markerLngLat) {
					markerLngLat = null;
					showMarker = false;
				} else {
					showMarker = true;
					markerLngLat = e.lngLat;

					const windowX = e.originalEvent.clientX;
					const windowY = e.originalEvent.clientY;

					contextMenuState = {
						show: true,
						x: windowX,
						y: windowY,
						lngLat: e.lngLat
					};
				}
				return;
			}

			const selectedVecterLayersId = features.map((feature) => feature.layer.id);
			const selectedRasterLayersId = layerEntries
				.filter((entry) => {
					if (entry.type === 'raster' && entry.interaction.clickable && entry.style.visible) {
						if (entry.metaData.location === '全国') {
							return true;
						} else if (isPointInBbox(e.lngLat, entry.metaData.bounds)) {
							return true;
						}
					}
				})
				.map((entry) => entry.id);

			// ストリートビューに切り返る
			if (selectedVecterLayersId.includes('@street_view_circle_layer')) {
				const features = mapStore.queryRenderedFeatures(e.point, {
					layers: ['@street_view_circle_layer']
				});

				if (features.length > 0 && streetViewPointData.features.length > 0) {
					const feature = features[0];
					const nodeId = feature.properties.node_id;

					setStreetViewParams(nodeId);
				}

				return;
			}

			// ストリートビューに切り返る
			if (selectedVecterLayersId.includes('@street_view_line_layer')) {
				const features = mapStore.queryRenderedFeatures(e.point, {
					layers: ['@street_view_line_layer']
				});

				if (features.length) {
					const feature = features[0];

					// LineString の座標一覧
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

					// 始点/終点の判定
					if (closestPoint) {
						const first = lineCoordinates[0];
						const last = lineCoordinates[lineCoordinates.length - 1];

						const isFirst = closestPoint[0] === first[0] && closestPoint[1] === first[1];
						const isLast = closestPoint[0] === last[0] && closestPoint[1] === last[1];

						let nodeId;

						if (isFirst) {
							// 始点
							nodeId = feature.properties.source;
						} else if (isLast) {
							// 終点
							nodeId = feature.properties.target;
						} else {
							// 中間点の場合は始点
							nodeId = feature.properties.source;
						}

						// const bearing = turfBearing(turfPoint(first), turfPoint(last), { final: true });

						// isExternalCameraUpdate = true;

						// cameraBearing = bearing;

						setStreetViewParams(nodeId);
					}

					return;
				}
			}

			// 検索結果の地物クリック処理
			const searchFeatures = mapStore.queryRenderedFeatures(e.point, {
				layers: ['@search_result']
			});

			if (searchFeatures.length > 0) {
				const { properties } = searchFeatures[0];

				const result = searchResults?.find((result) => result.id === properties.id);
				focusFeature(result);

				// mapStore.panTo(feature.geometry.coordinates as [number, number], {
				// 	duration: 500
				// });
				// markerLngLat = new maplibregl.LngLat(...feature.geometry.coordinates);
				// showMarker = true;
				return;
			}

			// 通常の地物クリック処理
			const selectedLayerIds = [...selectedVecterLayersId, ...selectedRasterLayersId];
			clickedLayerIds = selectedLayerIds.length > 0 ? selectedLayerIds : [];

			if (features.length > 0) {
				const feature = features[0];
				const point =
					feature.geometry.type === 'Point'
						? feature.geometry.coordinates
						: ([e.lngLat.lng, e.lngLat.lat] as [number, number]);

				const geojsonFeature = mapGeoJSONFeatureToSidePopupData(feature, point);

				featureMenuData = geojsonFeature;

				// mapStore.panTo(e.lngLat, {
				// 	duration: 1000
				// });
			}
			// 検索マーカー

			const feature = features[0]; // 一番上のfeature
			const id = feature.id;
			const featureStateData = FeatureStateManager.get(feature.layer.id);

			markerLngLat = e.lngLat;
			showMarker = true;

			if (hoveredFeatureState) {
				if (hoveredId !== null) {
					mapStore.setFeatureState(
						{
							...hoveredFeatureState,
							id: hoveredId
						},
						{ selected: false }
					);
				}
			}

			if (featureStateData) {
				hoveredId = id as number;
				hoveredFeatureState = featureStateData;
				mapStore.setFeatureState(
					{
						...hoveredFeatureState,
						id: id as number
					},
					{ selected: true }
				);
			}
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

	// NOTE: 初期読み込み時のエラーを防ぐため、レイヤーが読み込まれるまで待つ
	mapStore.onMousemove((e) => {
		const clickLayerIds = [...$clickableVectorIds];

		const existingLayerIds = clickLayerIds.filter((layerId) => {
			return mapStore.getLayer(layerId) !== undefined;
		});
		const features = mapStore.queryRenderedFeatures(e.point, {
			layers: existingLayerIds
		});

		if (features.length > 0) {
			mapStore.setCursor('pointer');

			// TODO: ツールチップの表示
			// toggleTooltip(e, features[0]);
		} else {
			mapStore.setCursor('default');
			// toggleTooltip();
		}
	});

	mapStore.onMouseDown((e) => {
		mapStore.setCursor('move');
	});

	mapStore.onMouseUp((e) => {
		mapStore.setCursor('default');
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
		if (!featureMenuData || featureMenuData.layerId === 'fac_poi') {
			if (hoveredId !== null && hoveredFeatureState !== null) {
				mapStore.setFeatureState(
					{
						...hoveredFeatureState,
						id: hoveredId
					},
					{ selected: false }
				);
				hoveredId = null;
			}
		}
	});
</script>

<div></div>

<style>
</style>
