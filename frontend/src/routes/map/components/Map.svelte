<script lang="ts">
	// import turfDissolve from '@turf/dissolve';
	import turfBearing from '@turf/bearing';
	import turfBooleanCrosses from '@turf/boolean-crosses';
	import turfBuffer from '@turf/buffer';
	import turfDistance from '@turf/distance';
	import turfNearestPoint from '@turf/nearest-point';
	// import turfUnion from '@turf/union';
	import { debounce } from 'es-toolkit';
	import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, GeoJSON } from 'geojson';
	import maplibregl from 'maplibre-gl';
	import type {
		StyleSpecification,
		MapGeoJSONFeature,
		SourceSpecification,
		CanvasSourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		BackgroundLayerSpecification,
		Marker,
		LngLat,
		Popup
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import { onMount, mount } from 'svelte';

	import Attribution from '$map/components/Attribution.svelte';
	import Compass from '$map/components/control/Compass.svelte';
	import GeolocateControl from '$map/components/control/GeolocateControl.svelte';
	import ScaleControl from '$map/components/control/ScaleControl.svelte';
	import TerrainControl from '$map/components/control/TerrainControl.svelte';
	import ZoomControl from '$map/components/control/ZoomControl.svelte';
	import DataManu from '$map/components/DataManu.svelte';
	import HeaderMenu from '$map/components/HeaderMenu.svelte';
	import InfoDialog from '$map/components/InfoDialog.svelte';
	import LayerMenu from '$map/components/LayerMenu.svelte';
	import SelectionMarker from '$map/components/marker/SelectionMarker.svelte';
	import LegendPopup from '$map/components/popup/LegendPopup.svelte';
	import SelectionPopup from '$map/components/popup/SelectionPopup.svelte';
	import SidePopup from '$map/components/popup/SidePopup.svelte';
	import TablePopup from '$map/components/popup/TablePopup.svelte';
	import SideMenu from '$map/components/SideMenu.svelte';
	import AngleMarker from '$map/components/StreetView/AngleMarker.svelte';
	import StreetViewCanvas from '$map/components/StreetView/ThreeCanvas.svelte';
	import TermsOfServiceDialog from '$map/components/TermsOfServiceDialog.svelte';
	import { MAPLIBRE_POPUP_OPTIONS, MAP_POSITION, type MapPosition } from '$map/constants';
	import { geoDataEntry } from '$map/data';
	import type { GeoDataEntry } from '$map/data/types';
	import type { ZoomLevel, CategoryLegend, GradientLegend } from '$map/data/types/raster';
	import Draggable from '$map/debug/Draggable.svelte';
	import GuiControl from '$map/debug/GuiControl.svelte';
	import JsonEditor from '$map/debug/JsonEditor.svelte';
	import { debugJson } from '$map/debug/store';
	import { createLayersItems } from '$map/layers';
	import { createSourcesItems } from '$map/sources';
	import { mapStore } from '$map/store/map';
	import { mapGeoJSONFeatureToSidePopupData, type SidePopupData } from '$map/utils/geojson';
	import { isPointInBbox } from '$map/utils/map';
	import { setStreetViewParams, getStreetViewParams } from '$map/utils/params';
	import { getPixelColor, getGuide } from '$map/utils/raster';
	import {
		addedLayerIds,
		showLayerOptionId,
		clickableVectorIds,
		clickableRasterIds,
		DEBUG_MODE,
		selectedHighlightData,
		isStreetView
	} from '$routes/map/store';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
	let showJsonEditor = $state<{
		value: boolean;
	}>({ value: false });
	let tempLayerEntries = $state<GeoDataEntry[]>([]); // 一時レイヤーデータ
	let layerEntries = $state<GeoDataEntry[]>([]); // レイヤーデータ

	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ

	let maplibrePopup = $state<Popup | null>(null); // ポップアップ
	let maplibreMarker = $state<Marker | null>(null); // マーカー
	let clickedLayerIds = $state<string[]>([]); // 選択ポップアップ
	let clickedLngLat = $state<LngLat | null>(null); // 選択ポップアップ
	let sidePopupData = $state<SidePopupData | null>(null);
	let inputSearchWord = $state<string>(''); // 検索ワード

	// ストリートビューのデータ
	let nextPointData = $state<any>(null);
	let angleMarker = $state<Marker | null>(null); // マーカー
	let streetViewPoint = $state<any>(null);
	let streetViewPointData = $state<any>({
		type: 'FeatureCollection',
		features: []
	});
	let streetViewLineData = $state<any>({
		type: 'FeatureCollection',
		features: []
	});
	let cameraBearing = $state<number>(0);

	// ストリートビューのデータの取得
	const setPoint = (point) => {
		if (!point) return;
		streetViewPoint = point;

		setStreetViewParams(point.properties['ID']);

		const targetPoint = point;

		const buffer = turfBuffer(point, 0.001, { units: 'kilometers' });

		const targetLines = streetViewLineData.features.filter((line) => {
			return turfBooleanCrosses(buffer, line);
		});

		const mapInstance = mapStore.getMap();

		if (!mapInstance) return;

		// mapInstance.flyTo({
		// 	center: targetPoint.geometry.coordinates,
		// 	zoom: 18,
		// 	speed: 1.5,
		// 	curve: 1
		// });

		if ($isStreetView) {
			mapInstance.panTo(point.geometry.coordinates, {
				duration: 1000,
				animate: true,
				zoom: mapInstance.getZoom() > 18 ? mapInstance.getZoom() : (18 as number)
			});
		}

		if (angleMarker) {
			angleMarker.remove();
		}

		const markerContainer = document.createElement('div');
		mount(AngleMarker, {
			target: markerContainer,
			props: {
				cameraBearing: cameraBearing
			}
		});

		angleMarker = new maplibregl.Marker({
			element: markerContainer,
			pitchAlignment: 'map',
			rotationAlignment: 'map'
		})
			.setLngLat(point.geometry.coordinates)
			.addTo(mapInstance);

		const nextData = [];

		targetLines.forEach((line) => {
			const crosses = findFarthestVertex(point, line);
			const nextPoint = turfNearestPoint(crosses, streetViewPointData);

			const bearing = turfBearing(point, nextPoint);
			nextData.push({
				feaureData: nextPoint,
				bearing: bearing
			});
		});

		nextPointData = nextData;
	};

	// 各ラインの最も遠い頂点を抽出する関数
	const findFarthestVertex = (point, line) => {
		let farthestVertex = null;
		let maxDistance = 0;

		line.geometry.coordinates.forEach((coord) => {
			const distance = turfDistance(point, coord, { units: 'kilometers' }); // 距離を計算 (キロメートル単位)

			if (distance > maxDistance) {
				maxDistance = distance;
				farthestVertex = coord;
			}
		});

		return farthestVertex;
	};

	// TODO: CanvasLayerの実装
	// let canvasSource = $state<CanvasSourceSpecification>({
	// 	type: 'canvas',
	// 	canvas: 'canvas-layer',
	// 	coordinates: [
	// 		[136.91278, 35.556704],
	// 		[136.92986, 35.556704],
	// 		[136.92986, 35.543576],
	// 		[136.91278, 35.543576]
	// 	]
	// });

	// let canvasLayer = $state<LayerSpecification>({
	// 	id: 'canvas-layer',
	// 	type: 'raster',
	// 	source: 'canvasSource'
	// });

	// let overlayLayer = $state<BackgroundLayerSpecification>({
	// 	id: 'overlay-layer',
	// 	type: 'background',
	// 	paint: {
	// 		'background-color': '#000000',
	// 		'background-opacity': 0.0
	// 	}
	// });

	// mapStyleの作成
	const createMapStyle = async (_dataEntries: GeoDataEntry[]): Promise<StyleSpecification> => {
		// ソースとレイヤーの作成
		const sources = await createSourcesItems(_dataEntries);
		const layers = await createLayersItems(_dataEntries);

		const terrain = mapStore.getTerrain();

		const mapStyle = {
			version: 8,
			glyphs: './font/{fontstack}/{range}.pbf', // TODO; フォントの検討
			sources: {
				terrain: gsiTerrainSource,
				street_view_line: {
					type: 'geojson',
					data: 'https://raw.githubusercontent.com/forestacdev/ensyurin-webgis-data/main/geojson/THETA360_line.geojson'
				},
				...sources
			},
			layers: [
				...layers,
				{
					id: 'street_view_line_layer',
					type: 'line',
					source: 'street_view_line',
					paint: {
						'line-color': '#ff0000',
						'line-width': 10,
						'line-opacity': 0,
						'line-blur': 0.5
					},
					layout: {
						'line-cap': 'round',
						'line-join': 'round'
					}
				}
				// overlayLayer
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
			terrain: terrain ? terrain : undefined
		};

		// NOTE:debug
		if (import.meta.env.DEV) debugJson.set(mapStyle);

		return mapStyle as StyleSpecification;
	};

	// レイヤーの追加
	addedLayerIds.subscribe((ids) => {
		if (import.meta.env.DEV) {
			const debugEntry = geoDataEntry.filter((entry) => entry.debug);
			if (debugEntry.length > 0) {
				debugEntry.forEach((entry) => {
					console.warn('デバッグデータのみ追加します。', entry.id);
				});
				layerEntries = [...debugEntry, ...tempLayerEntries];
				return;
			}
		}

		const filteredDataEntry = [...geoDataEntry, ...tempLayerEntries].filter((entry) =>
			ids.includes(entry.id)
		);

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

		streetViewPointData = await fetch(
			'https://raw.githubusercontent.com/forestacdev/ensyurin-webgis-data/main/geojson/THETA360.geojson'
		)
			.then((res) => res.json())
			.then((data) => {
				return data;
			});

		streetViewLineData = await fetch(
			'https://raw.githubusercontent.com/forestacdev/ensyurin-webgis-data/main/geojson/THETA360_line.geojson'
		)
			.then((res) => res.json())
			.then((data) => {
				return data;
			});

		const imageId = getStreetViewParams();
		if (imageId) {
			const targetPoint = streetViewPointData.features.find((point) => {
				return point.properties['ID'] === imageId;
			});

			if (targetPoint) {
				const mapInstance = mapStore.getMap();
				if (mapInstance) {
					mapInstance.flyTo({
						center: targetPoint.geometry.coordinates,
						zoom: 18,
						speed: 1.5,
						curve: 1
					});
				}
			}

			setPoint(targetPoint);
		}
	});

	const setStyleDebounce = debounce(async (entries: GeoDataEntry[]) => {
		const mapStyle = await createMapStyle(entries as GeoDataEntry[]);
		mapStore.setStyle(mapStyle);
	}, 100);

	$effect(() => {
		const currentEntries = $state.snapshot(layerEntries);
		setStyleDebounce(currentEntries as GeoDataEntry[]);
	});

	// selectedHighlightData.subscribe((data) => {
	// 	setStyleDebounce(layerEntries as GeoDataEntry[]);
	// });

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

	const generateMarker = (lngLat: LngLat) => {
		const markerContainer = document.createElement('div');
		mount(SelectionMarker, {
			target: markerContainer,
			props: {
				lngLat
			}
		});

		if (maplibreMarker) {
			maplibreMarker.remove();
		}

		maplibreMarker = new maplibregl.Marker({
			element: markerContainer
		})
			.setLngLat(lngLat)
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

	// 地図のクリックイベント
	mapStore.onClick((e) => {
		if (clickedLayerIds.length > 0) {
			clickedLayerIds = [];
			if (maplibreMarker) {
				maplibreMarker.remove();
			}
			if (clickedLngLat) {
				clickedLngLat = null;
			}
			if (sidePopupData) {
				sidePopupData = null;
			}
			if (inputSearchWord) {
				inputSearchWord = '';
			}
			return;
		}

		// console.log('click', e);
		if (!e) return;

		if (streetViewPointData.features.length > 0) {
			const point = turfNearestPoint([e.lngLat.lng, e.lngLat.lat], streetViewPointData);
			const distance = turfDistance(point, [e.lngLat.lng, e.lngLat.lat], { units: 'meters' });
			if (distance < 100) {
				// streetViewPoint = point;
				setPoint(point);
			}
		}

		const features = mapStore.queryRenderedFeatures(e.point, {
			layers: $clickableVectorIds
		});
		// if (!features || features?.length === 0) {
		// 	const lngLat = e.lngLat;
		// 	onRasterClick(lngLat);
		// 	return;
		// }

		if (!features || features?.length === 0) {
			return;
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

		const selectedLayerIds = [...selectedVecterLayersId, ...selectedRasterLayersId];
		clickedLayerIds = selectedLayerIds.length > 0 ? selectedLayerIds : [];
		clickedLngLat = e.lngLat;
		generateMarker(clickedLngLat);

		const feature = features[0];

		const geojsonFeature = mapGeoJSONFeatureToSidePopupData(feature);

		sidePopupData = geojsonFeature;

		return;

		const lngLat = e.lngLat;

		const layerId = feature.layer.id;
		const featureId = feature.id as number;

		const entry = layerEntries.find((entry) => entry.id === layerId);
		if (!entry || featureId === undefined || entry.type !== 'vector') return;
		const propKes = entry.properties.keys;

		if (!propKes) return;

		feature.properties = Object.entries(feature.properties)
			.filter(([key, value]) => propKes.includes(key))
			.reduce<Record<string, string | number>>((acc, [key, value]) => {
				acc[key] = value;
				return acc;
			}, {});

		// console.log('features', features);

		// const highlightFeatures = features.filter((feature) => feature.layer.id === layerId);
		// const data = convertToGeoJSONCollection(highlightFeatures, featureId);

		// if (data.features.length === 0) return;

		// console.log('data', data);

		// let geojson;

		// if (data.features.length > 1) {
		// 	geojson = turfDissolve(data);
		// } else {
		// 	geojson = data;
		// }

		// if (!geojson) return;
		// ポッアップの作成
		if ($DEBUG_MODE) {
			console.log('featureId', featureId);
			generatePopup(feature, lngLat);
		}

		$selectedHighlightData = {
			layerData: entry,
			featureId
		};
	});

	// streetビューの表示切り替え時
	isStreetView.subscribe((value) => {
		const map = mapStore.getMap();
		if (!map) return;
		if (value) {
			if (angleMarker) {
				map.setCenter(angleMarker._lngLat, {
					zoom: map.getZoom() > 18 ? map.getZoom() : 18
				});
			}
			map.setPaintProperty('street_view_line_layer', 'line-opacity', 1);
		} else {
			map.setPaintProperty('street_view_line_layer', 'line-opacity', 0);
		}
	});

	$effect(() => {
		if (cameraBearing && angleMarker) {
			// TODO: 回転の調整
			const markerContainer = angleMarker.getElement().firstElementChild;
			if (markerContainer) markerContainer.style.transform = `rotateZ(${-cameraBearing + 180}deg)`;
		}
	});

	mapStore.onSetStyle((e) => {});
</script>

<!-- <Menu /> -->

<div class="relative h-full w-full">
	<SideMenu />
	<HeaderMenu bind:sidePopupData {layerEntries} bind:inputSearchWord />
	<LayerMenu bind:layerEntries bind:tempLayerEntries />
	<!-- <LayerOptionMenu bind:layerToEdit bind:tempLayerEntries /> -->
	<div
		bind:this={mapContainer}
		class="css-map absolute flex-grow transition-all duration-500 {$isStreetView
			? 'bottom-2 left-2 z-20 h-[200px] w-[300px] overflow-hidden rounded-md border-4 border-white bg-white'
			: 'bottom-0 left-0 h-full w-full'}"
	></div>
	<StreetViewCanvas feature={streetViewPoint} {nextPointData} bind:cameraBearing {setPoint} />
	<!-- <CanvasLayer bind:canvasSource /> -->
	<Compass />
	<ZoomControl />
	<TerrainControl />
	<GeolocateControl />
	<ScaleControl />
	<Attribution />
	<SelectionPopup bind:clickedLayerIds {layerEntries} {clickedLngLat} />
	<SidePopup bind:sidePopupData {layerEntries} />

	<DataManu />
	<InfoDialog />
	<TermsOfServiceDialog />
</div>

{#if $DEBUG_MODE}
	{#if showJsonEditor.value}
		<Draggable left={0} top={0}>
			<JsonEditor map={mapStore.getMap()} />
		</Draggable>
	{/if}

	<GuiControl map={mapStore.getMap()} {showJsonEditor} />
{/if}

<style>
	/* maplibreのデフォルトの出典表記を非表示 */
	:global(.maplibregl-ctrl.maplibregl-ctrl-attrib) {
		display: none !important;
	}

	/* TODO:マップの調整 */
	.css-map {
		filter: saturate(80%);
	}
</style>
