<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type { LngLat, MapMouseEvent, Popup, MapGeoJSONFeature } from 'maplibre-gl';
	import { onDestroy } from 'svelte';
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
	import type { FeatureCollection } from 'geojson';
	import type { StreetViewPoint } from '$routes/map/types/street-view';
	import type { FeatureMenuData } from '$routes/map/types';

	interface Props {
		markerLngLat: maplibregl.LngLat | null;
		streetViewPointData: FeatureCollection;
		setPoint: (streetViewPoint: StreetViewPoint) => void;
		showMarker: boolean;
		clickedLayerIds: string[];
		featureMenuData: FeatureMenuData | null;
		layerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
		toggleTooltip: (e?: MapMouseEvent, feature?: MapGeoJSONFeature) => void;
	}

	let {
		markerLngLat = $bindable(),
		featureMenuData = $bindable(),
		showMarker = $bindable(),
		clickedLayerIds = $bindable(),
		streetViewPointData,
		setPoint,
		layerEntries,
		showDataEntry,
		toggleTooltip
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

	mapStore.onClick((e: MapMouseEvent) => {
		try {
			if (import.meta.env.MODE === 'development') {
				const features = mapStore.queryRenderedFeatures(e.point);

				if (features.length === 0) {
					console.warn('No features found at clicked point.');
					return;
				}
				console.log('Clicked features:', features);

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
			if (showDataEntry) return;

			const clickLayerIds = [...$clickableVectorIds];
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
				}
				return;
			}

			if ($isStyleEdit) {
				// 編集モードの時は、クリックしたレイヤーを編集対象にする
				const clickedLayer = features[0].layer.id;
				const clickedLayerEntry = layerEntries.find((layer) => layer.id === clickedLayer);
				if (clickedLayerEntry) {
					selectedLayerId.set(clickedLayerEntry.id);
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
					const point = streetViewPointData.features.find(
						(f) => f.properties.id === feature.properties.id
					);

					if (point) {
						setPoint(point as StreetViewPoint);
						isStreetView.set(true);
					}
				}
				// TODO: ストリートビュー用のクリックイベントを実装する
				// mapStore.onClick((e) => {
				// 	if (!e || $mapMode === 'edit') return;
				// 	if (streetViewPointData.features.length > 0) {
				// 		const point = turfNearestPoint([e.lngLat.lng, e.lngLat.lat], streetViewPointData);
				// 		const distance = turfDistance(point, [e.lngLat.lng, e.lngLat.lat], { units: 'meters' });
				// 		if (distance < 100) {
				// 			// streetViewPoint = point;
				// 			setPoint(point as StreetViewPoint);
				// 		}
				// 	}
				// });
				return;
			}

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
		if (!featureMenuData) {
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
