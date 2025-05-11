<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type { LngLat, MapMouseEvent, Popup, MapGeoJSONFeature } from 'maplibre-gl';
	import { onDestroy } from 'svelte';
	import { mount } from 'svelte';

	import LegendPopup from '$routes/components/popup/LegendPopup.svelte';
	import TablePopup from '$routes/components/popup/TablePopup.svelte';
	import { MAPLIBRE_POPUP_OPTIONS } from '$routes/constants';
	import type { GeoDataEntry } from '$routes/data/types';
	import type { CategoryLegend, GradientLegend, ZoomLevel } from '$routes/data/types/raster';
	import { isStreetView, clickableVectorIds, clickableRasterIds } from '$routes/store';
	import { mapMode, DEBUG_MODE, selectedLayerId } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import { FeatureStateManager, type FeatureStateData } from '$routes/utils/featureState';
	import { mapGeoJSONFeatureToSidePopupData, type FeatureMenuData } from '$routes/utils/geojson';
	import { isPointInBbox } from '$routes/utils/map';
	import { getPixelColor, getGuide } from '$routes/utils/raster';

	interface Props {
		map: maplibregl.Map;
		markerLngLat: maplibregl.LngLat | null;
		showMarker: boolean;
		clickedLayerIds: string[];
		featureMenuData: FeatureMenuData | null;
		layerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
		toggleTooltip: (e?: MapMouseEvent, feature?: MapGeoJSONFeature) => void;
	}

	let {
		map,
		markerLngLat = $bindable(),
		featureMenuData = $bindable(),
		showMarker = $bindable(),
		clickedLayerIds = $bindable(),
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

	map.on('click', (e) => {
		// プレビューモードの時は、クリックイベントを無視する
		if (showDataEntry) return;

		// console.log(map.queryRenderedFeatures(e.point));
		const clickLayerIds = ['@street_view_circle_layer', ...$clickableVectorIds];
		const features = map.queryRenderedFeatures(e.point, {
			layers: clickLayerIds
		});

		if (!features.length) {
			if (hoveredId !== null && hoveredFeatureState !== null) {
				map.setFeatureState(
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

		if ($mapMode === 'edit') {
			// 編集モードの時は、クリックしたレイヤーを編集対象にする
			const clickedLayer = features[0].layer.id;
			const clickedLayerEntry = layerEntries.find((layer) => layer.id === clickedLayer);
			if (clickedLayerEntry) {
				selectedLayerId.set(clickedLayerEntry.id);
			}
		}

		const selectedVecterLayersId = features.map((feature) => feature.layer.id);
		const selectedRasterLayersId = layerEntries
			.filter((entry) => {
				if (entry.type === 'raster' && entry.interaction.clickable && entry.style.visible) {
					if (entry.metaData.location === '全国') {
						return true;
					} else if (entry.metaData.bounds && isPointInBbox(e.lngLat, entry.metaData.bounds)) {
						return true;
					}
				}
			})
			.map((entry) => entry.id);

		// ストリートビューに切り返る
		if (selectedVecterLayersId.includes('@street_view_circle_layer')) {
			isStreetView.set(true);
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

		if ($DEBUG_MODE) {
			console.warn(features);
		}

		const feature = features[0]; // 一番上のfeature
		const id = feature.id;
		const featureStateData = FeatureStateManager.get(feature.layer.id);

		markerLngLat = e.lngLat;
		showMarker = true;

		if (hoveredFeatureState) {
			if (hoveredId !== null) {
				map.setFeatureState(
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
			map.setFeatureState(
				{
					...hoveredFeatureState,
					id: id as number
				},
				{ selected: true }
			);
		}
	});

	map.on('load', () => {
		map.on('mousemove', (e) => {
			const clickLayerIds = [...$clickableVectorIds];
			const features = map.queryRenderedFeatures(e.point, {
				layers: clickLayerIds
			});

			if (features.length > 0) {
				map.getCanvas().style.cursor = 'pointer';
				toggleTooltip(e, features[0]);
			} else {
				map.getCanvas().style.cursor = 'default';
				toggleTooltip();
			}
		});
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
				map.setFeatureState(
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

	onDestroy(() => {
		const map = mapStore.getMap();
		if (!map) return;
	});
</script>

<div></div>

<style>
</style>
