<script lang="ts" module>
	export interface StreetViewPoint {
		type: 'Feature';
		geometry: {
			type: 'Point';
			coordinates: [number, number];
		};
		properties: {
			ID: string;
			name: string;
			Name: string;
		};
	}
	export interface NextPointData {
		featureData: StreetViewPoint;
		bearing: number;
	}

	export interface StreetViewPointGeoJson {
		type: 'FeatureCollection';
		features: StreetViewPoint[];
	}

	export type DialogType = 'raster' | 'vector' | 'shp' | 'gpx' | 'wmts' | 'tiff' | null;
</script>

<script lang="ts">
	import turfBearing from '@turf/bearing';
	import turfDistance from '@turf/distance';
	import turfNearestPoint from '@turf/nearest-point';
	import { debounce } from 'es-toolkit';
	import { delay } from 'es-toolkit';
	import type { FeatureCollection } from 'geojson';
	import maplibregl from 'maplibre-gl';
	import type { Marker, LngLat } from 'maplibre-gl';
	import { onMount, mount } from 'svelte';
	import { slide } from 'svelte/transition';

	import DataMenu from '$routes/components/data-menu/DataMenu.svelte';
	import InfoDialog from '$routes/components/dialog/InfoDialog.svelte';
	import TermsOfServiceDialog from '$routes/components/dialog/TermsOfServiceDialog.svelte';
	import DrawMenu from '$routes/components/draw-menu/DrawMenu.svelte';
	import FeatureMenu from '$routes/components/feature-menu/featureMenu.svelte';
	import FooterMenu from '$routes/components/footer/_Index.svelte';
	import HeaderMenu from '$routes/components/Header/_Index.svelte';
	import LayerMenu from '$routes/components/layer-menu/_Index.svelte';
	import LayerStyleMenu from '$routes/components/layer-style-menu/LayerStyleMenu.svelte';
	import MapLibreMap from '$routes/components/Map.svelte';
	import NotificationMessage from '$routes/components/NotificationMessage.svelte';
	import DataPreview from '$routes/components/preview-menu/DataPreview.svelte';
	import PreviewMenu from '$routes/components/preview-menu/PreviewMenu.svelte';
	import SearchMenu from '$routes/components/search-menu/SearchMenu.svelte';
	import SideMenu from '$routes/components/side-menu/_Index.svelte';
	import AngleMarker from '$routes/components/street-view/AngleMarker.svelte';
	import StreetViewCanvas from '$routes/components/street-view/ThreeCanvas.svelte';
	import TerrainMenu from '$routes/components/terrain-menu/TerrainMenu.svelte';
	import Tooltip from '$routes/components/Tooltip.svelte';
	import UploadDaialog from '$routes/components/upload/BaseDaialog.svelte';
	import { STREET_VIEW_DATA_PATH } from '$routes/constants';
	import { geoDataEntries } from '$routes/data';
	import type { GeoDataEntry } from '$routes/data/types';
	import ProcessingScreen from '$routes/ProcessingScreen.svelte';
	import SplashScreen from '$routes/SplashScreen.svelte';
	import { isStreetView, mapMode, selectedLayerId, isStyleEdit } from '$routes/store';
	import { orderedLayerIds } from '$routes/store/layers';
	import { mapStore } from '$routes/store/map';
	import { isSideMenuType } from '$routes/store/ui';
	import type { DrawGeojsonData } from '$routes/types/draw';
	import { type FeatureMenuData, type ClickedLayerFeaturesData } from '$routes/utils/file/geojson';
	import { getFgbToGeojson } from '$routes/utils/file/geojson';
	import { setStreetViewParams, getStreetViewParams } from '$routes/utils/params';

	type NodeConnections = Record<string, string[]>;
	let tempLayerEntries = $state<GeoDataEntry[]>([]); // 一時レイヤーデータ

	let layerEntriesData = $derived.by(() => {
		return [...geoDataEntries, ...tempLayerEntries];
	});

	let layerEntries = $state<GeoDataEntry[]>([]); // アクティブなレイヤーデータ
	let showDataEntry = $state<GeoDataEntry | null>(null); // プレビュー用のデータ
	let dropFile = $state<File | FileList | null>(null); // ドロップしたファイル

	let isStyleEditEntry = $derived.by(() => {
		const targetEntry = layerEntries.find((entry) => entry.id === $selectedLayerId);
		if (targetEntry && $isStyleEdit) {
			return targetEntry;
		} else {
			return null;
		}
	});
	let inputSearchWord = $state<string>(''); // 検索ワード

	let drawGeojsonData = $state<DrawGeojsonData>({
		type: 'FeatureCollection',
		features: []
	}); // 描画データ

	// ストリートビューのデータ
	let nextPointData = $state<NextPointData[] | null>(null);
	let nodeConnectionsJson = $state<NodeConnections>({}); // ノード接続データ
	let angleMarker = $state<Marker | null>(null); // マーカー
	let streetViewPoint = $state<StreetViewPoint | null>(null);
	let streetViewPointData = $state<StreetViewPointGeoJson>({
		type: 'FeatureCollection',
		features: []
	});
	let streetViewLineData = $state<FeatureCollection>({
		type: 'FeatureCollection',
		features: []
	});
	let cameraBearing = $state<number>(0);
	let showMapCanvas = $state<boolean>(true);
	let showThreeCanvas = $state<boolean>(false);
	let featureMenuData = $state<FeatureMenuData | null>(null);

	// 選択マーカー
	let showSelectionMarker = $state<boolean>(false); // マーカーの表示
	let selectionMarkerLngLat = $state<LngLat | null>(null); // マーカーの位置

	let showDialogType = $state<DialogType>(null);

	const markerContainer = document.createElement('div');
	document.body.appendChild(markerContainer);

	onMount(async () => {
		mount(AngleMarker, {
			target: markerContainer,
			props: {
				cameraBearing: cameraBearing,
				angleMarker
			}
		});
		streetViewPointData = (await getFgbToGeojson(
			`${STREET_VIEW_DATA_PATH}/nodes.fgb`
		)) as StreetViewPointGeoJson;

		streetViewLineData = await getFgbToGeojson(`${STREET_VIEW_DATA_PATH}/links.fgb`);

		nodeConnectionsJson = await fetch(`${STREET_VIEW_DATA_PATH}/node_connections.json`).then(
			(res) => res.json()
		);

		const imageId = getStreetViewParams();
		if (imageId) {
			// const targetPoint = streetViewPointData.features.find((point) => {
			// 	return point.properties['ID'] === imageId;
			// });
			// if (targetPoint) {
			// 	const mapInstance = mapStore.getMap();
			// 	if (mapInstance) {
			// 		mapInstance.flyTo({
			// 			center: targetPoint.geometry.coordinates,
			// 			zoom: 18,
			// 			speed: 1.5,
			// 			curve: 1
			// 		});
			// 	}
			// }
			// setPoint(targetPoint);
			// $isStreetView = true;
		}
	});

	// ストリートビューのデータの取得
	const setPoint = async (point: StreetViewPoint) => {
		if (!point) return;
		const pointId = point.properties['ID'];

		setStreetViewParams(pointId);

		const nextPoints = (nodeConnectionsJson[pointId] || [])
			.map((id) => streetViewPointData.features.find((point) => point.properties['ID'] === id))
			.filter((nextPoint): nextPoint is StreetViewPoint => nextPoint !== undefined)
			.map((nextPoint) => ({
				featureData: nextPoint,
				bearing: turfBearing(point, nextPoint)
			}));
		const map = mapStore.getMap();

		if (!map) return;

		if ($isStreetView) {
			setCamera(map, point.geometry.coordinates);
			map.panTo(point.geometry.coordinates, {
				duration: 1000,
				animate: true
			});
		}

		if (angleMarker) {
			angleMarker.remove();
		}

		angleMarker = new maplibregl.Marker({
			element: markerContainer,

			pitchAlignment: 'map',
			rotationAlignment: 'map',
			draggable: true,
			rotation: -cameraBearing + 180
		})
			.setLngLat(point.geometry.coordinates)

			.addTo(map);

		angleMarker.togglePopup();

		nextPointData = nextPoints;
		streetViewPoint = point;

		// マーカーのドラッグ
		angleMarker?.on('dragend', () => {
			const lngLat = angleMarker?.getLngLat();
			if (!lngLat) return;
			const point = turfNearestPoint([lngLat.lng, lngLat.lat], streetViewPointData);
			setPoint(point as StreetViewPoint);
		});
	};

	// マーカーの回転
	$effect(() => {
		if (cameraBearing && angleMarker) {
			angleMarker.setRotation(-cameraBearing + 180);
		}
	});

	mapStore.onClick((e) => {
		if (!e || $mapMode === 'edit') return;
		if (streetViewPointData.features.length > 0) {
			const point = turfNearestPoint([e.lngLat.lng, e.lngLat.lat], streetViewPointData);
			const distance = turfDistance(point, [e.lngLat.lng, e.lngLat.lat], { units: 'meters' });
			if (distance < 100) {
				// streetViewPoint = point;
				setPoint(point as StreetViewPoint);
			}
		}
	});

	const setCamera = (map: maplibregl.Map, lngLat: maplibregl.LngLat) => {
		// https://github.com/maplibre/maplibre-gl-js/issues/4688

		const elevation = map.queryTerrainElevation(lngLat);

		map.setCenterClampedToGround(false);
		map.setCenterElevation(elevation ?? 0);

		map._elevationStart = map._elevationTarget;
	};

	const resetCamera = (map: maplibregl.Map) => {
		map.setCenterClampedToGround(true); // 地形に中心点を吸着させる
		map.setCenterElevation(0);
		map._elevationStart = map._elevationTarget;
	};

	// streetビューの表示切り替え時
	isStreetView.subscribe(async (value) => {
		const map = mapStore.getMap();
		if (!map) return;

		if (value) {
			setCamera(map, streetViewPoint.geometry.coordinates);
			map.easeTo({
				center: streetViewPoint.geometry.coordinates,
				zoom: 20,
				duration: 750,
				bearing: -cameraBearing + 180,
				pitch: 65
			});

			await delay(750);
			showMapCanvas = false;
			showThreeCanvas = true;

			await delay(500);

			map.setBearing(0);
			map.setPitch(0);
			$mapMode = 'small';
		} else {
			map.easeTo({
				center: streetViewPoint.geometry.coordinates,
				zoom: 20,
				duration: 0,
				bearing: -cameraBearing + 180,
				pitch: 65
			});

			$mapMode = 'view';
			showMapCanvas = true;
			showThreeCanvas = false;
			resetCamera(map);

			await delay(300);

			// マップを移動
			map.easeTo({
				zoom: 17,
				bearing: 0,
				pitch: 0,
				duration: 750
			});
		}
	});

	// レイヤーの追加、削除、並び替えを行う
	orderedLayerIds.subscribe((newOrderedIds) => {
		const currentLayerEntries = [...layerEntries];

		// 現在の layerEntries をIDをキーとしたマップに変換し、既存のレイヤーオブジェクトを素早く参照できるようにする
		const currentLayersMap = new Map(currentLayerEntries.map((entry) => [entry.id, entry]));

		const newLayerEntries = []; // 新しい layerEntries の内容を格納する配列

		for (const id of newOrderedIds) {
			let layer = currentLayersMap.get(id); // 現在のマップからレイヤーを検索

			if (layer) {
				// 既存の layerEntries にそのレイヤーがあれば、そのオブジェクトをそのまま利用する
				// これにより、そのレイヤーオブジェクトに対するプロパティの変更（例: active: false など）が保持されます。
				newLayerEntries.push(layer);
			} else {
				// 新しく orderedLayerIds に追加されたレイヤーであれば、layerEntriesData から取得する
				layer = layerEntriesData.find((entry) => entry.id === id);
				if (layer) {
					// layerEntriesData から取得したオブジェクトを、初期状態として追加

					newLayerEntries.push(layer);
				}
			}
		}

		// 新しいデータで再レンダリング。
		layerEntries = newLayerEntries;
	});
</script>

<div class="relative flex h-full w-full grow">
	<!-- マップのオフセット調整用 -->
	<!-- {#if $isSideMenuType}
		<div
			in:slide={{ duration: 1, delay: 200, axis: 'x' }}
			class="bg-main w-side-menu flex h-full shrink-0 flex-col"
		></div>
	{/if} -->
	<LayerMenu bind:layerEntries bind:tempLayerEntries />
	<SearchMenu
		bind:featureMenuData
		bind:inputSearchWord
		{layerEntries}
		bind:showSelectionMarker
		bind:selectionMarkerLngLat
	/>
	<DrawMenu bind:layerEntries bind:drawGeojsonData />

	<MapLibreMap
		bind:layerEntries
		bind:tempLayerEntries
		bind:showDataEntry
		bind:featureMenuData
		bind:showSelectionMarker
		bind:selectionMarkerLngLat
		bind:dropFile
		bind:showDialogType
		bind:drawGeojsonData
		{streetViewLineData}
		{streetViewPointData}
		{angleMarker}
		{streetViewPoint}
		{showMapCanvas}
	/>

	<HeaderMenu />
	<FooterMenu {layerEntries} />
	<LayerStyleMenu bind:layerEntry={isStyleEditEntry} bind:tempLayerEntries />
	<FeatureMenu bind:featureMenuData {layerEntries} />
	<PreviewMenu bind:showDataEntry />

	<TerrainMenu />
	{#if !showDataEntry}
		<DataMenu bind:showDataEntry bind:dropFile bind:showDialogType />
	{/if}
	{#if showDataEntry}
		<DataPreview bind:showDataEntry bind:tempLayerEntries />
	{/if}

	<StreetViewCanvas
		{streetViewPoint}
		{nextPointData}
		{showThreeCanvas}
		bind:cameraBearing
		{setPoint}
	/>
</div>
<UploadDaialog bind:showDialogType bind:showDataEntry bind:tempLayerEntries bind:dropFile />

<Tooltip />

<!-- Mobile -->
<!-- <div class="relative flex h-full w-full grow flex-col">
		<LayerMenu bind:layerEntries bind:tempLayerEntries />

		<Map
			bind:layerEntries
			bind:tempLayerEntries
			bind:featureMenuData
			{streetViewLineData}
			{streetViewPointData}
			{angleMarker}
			{streetViewPoint}
			{showMapCanvas}
			{showDataEntry}
		/>
		<FooterMenu {layerEntries} />
		<DataMenu {showDataEntry} />

		<StreetViewCanvas
			{streetViewPoint}
			{nextPointData}
			{showThreeCanvas}
			bind:cameraBearing
			{setPoint}
		/>
	</div> -->

<SideMenu />
<NotificationMessage />
<InfoDialog />
<TermsOfServiceDialog />

<ProcessingScreen />

<SplashScreen />

<style>
</style>
