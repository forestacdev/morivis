<script lang="ts">
	import turfBearing from '@turf/bearing';

	import { delay } from 'es-toolkit';
	import type { FeatureCollection } from 'geojson';
	import maplibregl from 'maplibre-gl';
	import type { LngLat } from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';

	import DataMenu from '$routes/map/components/data_menu/DataMenu.svelte';
	import InfoDialog from '$routes/map/components/dialog/InfoDialog.svelte';
	import TermsOfServiceDialog from '$routes/map/components/dialog/TermsOfServiceDialog.svelte';
	import DrawMenu from '$routes/map/components/draw_menu/DrawMenu.svelte';
	import FeatureMenu from '$routes/map/components/feature_menu/FeatureMenu.svelte';
	import FooterMenu from '$routes/map/components/footer/Footer.svelte';
	import HeaderMenu from '$routes/map/components/Header.svelte';
	import LayerMenu from '$routes/map/components/layer_menu/LayerMenu.svelte';
	import LayerStyleMenu from '$routes/map/components/layer_style_menu/LayerStyleMenu.svelte';
	import MapLibreMap from '$routes/map/components/Map.svelte';
	import NotificationMessage from '$routes/map/components/NotificationMessage.svelte';
	import DataPreview from '$routes/map/components/preview_menu/DataPreview.svelte';
	import PreviewMenu from '$routes/map/components/preview_menu/PreviewMenu.svelte';
	import SearchMenu from '$routes/map/components/search_menu/SearchMenu.svelte';
	import SideMenu from '$routes/map/components/SideMenu.svelte';

	import StreetViewCanvas from '$routes/map/components/street_view/ThreeCanvas.svelte';

	import Tooltip from '$routes/map/components/Tooltip.svelte';
	import UploadDialog from '$routes/map/components/upload/BaseDialog.svelte';
	import { STREET_VIEW_DATA_PATH } from '$routes/constants';
	import { geoDataEntries } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import ScreenGuard from '$routes/ScreenGuard.svelte';
	import { isStreetView, mapMode, selectedLayerId, isStyleEdit, DEBUG_MODE } from '$routes/stores';
	import { activeLayerIdsStore, showStreetViewLayer } from '$routes/stores/layers';
	import { mapStore } from '$routes/stores/map';
	import { isSideMenuType } from '$routes/stores/ui';
	import type { DrawGeojsonData } from '$routes/map/types/draw';
	import { type FeatureMenuData, type DialogType } from '$routes/map/types';
	import { getFgbToGeojson } from '$routes/map/utils/file/geojson';
	import { getStreetViewParams, get3dParams, getParams } from '$routes/map/utils/params';
	import type { RasterEntry, RasterDemStyle } from '$routes/map/data/types/raster';
	import ConfirmationDialog from '$routes/map/components/dialog/ConfirmationDialog.svelte';
	import type { NextPointData, StreetViewPoint, StreetViewPointGeoJson } from './types/street-view';
	import ZoneForm from '$routes/map/components/upload/form/ZoneForm.svelte';
	import type { EpsgCode } from '$routes/map/utils/proj/dict';

	type NodeConnections = Record<string, string[]>;
	let tempLayerEntries = $state<GeoDataEntry[]>([]); // 一時レイヤーデータ

	let layerEntriesData = $derived.by(() => {
		return [...geoDataEntries, ...tempLayerEntries];
	});

	let demEntries = $derived.by(() => {
		return geoDataEntries.filter((entry) => entry.type === 'raster' && entry.style.type === 'dem');
	}) as RasterEntry<RasterDemStyle>[];

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

	// ストリートビューのマーカー
	let showAngleMarker = $state<boolean>(false); // マーカーの表示
	let angleMarkerLngLat = $state<LngLat | null>(null); // マーカーの位置

	let showDialogType = $state<DialogType>(null);
	let showDebugWindow = $state<boolean>(false); // デバッグウィンドウの表示
	let showZoneForm = $state<boolean>(false); // 座標系フォームの表示状態
	let selectedEpsgCode = $state<EpsgCode>('4326'); // 初期値はWGS84

	// 初期化完了のフラグ
	let isInitialized = $state<boolean>(false);

	onMount(async () => {
		const params = getParams(location.search);

		if (params) {
			if (params.debug && params.debug === '1') {
				DEBUG_MODE.set(true);
			}
		}

		isInitialized = true;
		streetViewPointData = (await getFgbToGeojson(
			`${STREET_VIEW_DATA_PATH}/nodes.fgb`
		)) as StreetViewPointGeoJson;

		streetViewLineData = await getFgbToGeojson(`${STREET_VIEW_DATA_PATH}/links.fgb`);

		nodeConnectionsJson = await fetch(`${STREET_VIEW_DATA_PATH}/node_connections.json`).then(
			(res) => res.json()
		);

		mapStore.onload(() => {
			const imageId = getStreetViewParams();

			if (imageId) {
				const point = streetViewPointData.features.find(
					(point) => point.properties.id === Number(imageId)
				);
				if (point) {
					showStreetViewLayer.set(true);
					setPoint(point as StreetViewPoint);

					isStreetView.set(true);
				} else {
					console.warn(`Street view point with ID ${imageId} not found.`);
				}
			}

			const terrain3d = get3dParams();
			if (terrain3d === '1') {
				mapStore.toggleTerrain(true);
				// isTerrain3d.set(true);
			}
		});
	});

	// ストリートビューのデータの取得
	const setPoint = async (point: StreetViewPoint) => {
		if (!point) return;
		const pointId = point.properties.id;

		if (!pointId) {
			console.warn('Point ID is not defined');
			return;
		}

		const linkPoints = nodeConnectionsJson[pointId] || [];

		const nextPoints = [pointId, ...linkPoints]
			.map((id) => streetViewPointData.features.find((point) => point.properties.id === id))
			.filter((nextPoint): nextPoint is StreetViewPoint => nextPoint !== undefined)
			.map((nextPoint) => ({
				featureData: nextPoint,
				bearing: turfBearing(point, nextPoint)
			}));
		const map = mapStore.getMap();

		if (!map) return;

		const pointLngLat = new maplibregl.LngLat(
			point.geometry.coordinates[0],
			point.geometry.coordinates[1]
		);

		if ($isStreetView) {
			setCamera(map, pointLngLat);
			map.panTo(point.geometry.coordinates, {
				duration: 1000,
				animate: true
			});
		}

		angleMarkerLngLat = pointLngLat;

		nextPointData = nextPoints;
		streetViewPoint = nextPoints[0]?.featureData || point;
	};

	// レイヤーエントリーをリセット
	const resetlayerEntries = () => {
		layerEntries = [];
		activeLayerIdsStore.reset();
		selectedLayerId.set('');
		mapStore.jumpToFac();
	};

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
		if (!map || !map.loaded() || !streetViewPoint) return;

		showAngleMarker = value;

		const pointLngLat = new maplibregl.LngLat(
			streetViewPoint.geometry.coordinates[0],
			streetViewPoint.geometry.coordinates[1]
		);

		if (value) {
			setCamera(map, pointLngLat);
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
			map.setZoom(18);
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
	activeLayerIdsStore.subscribe((newOrderedIds) => {
		const currentLayerEntries = [...layerEntries];

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

	onDestroy(() => {
		// コンポーネントが破棄されるときに、スト
		isInitialized = false;
	});
</script>

{#if isInitialized}
	<div class="relative flex h-full w-full grow">
		<!-- マップのオフセット調整用 -->
		<!-- {#if $isSideMenuType}
		<div
			in:slide={{ duration: 1, delay: 200, axis: 'x' }}
			class="bg-main w-side-menu flex h-full shrink-0 flex-col"
		></div>
	{/if} -->

		<!-- メニューの背景 -->
		{#if $isSideMenuType}
			<!-- <div
			transition:fade={{ duration: 300 }}
			class="bg-side-menu pointer-events-none absolute z-10 flex h-full w-[400px] flex-col gap-2"
		></div> -->
		{/if}
		<LayerMenu bind:layerEntries bind:tempLayerEntries bind:showDataEntry {resetlayerEntries} />
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
			bind:showAngleMarker
			bind:angleMarkerLngLat
			bind:cameraBearing
			bind:dropFile
			bind:showDialogType
			bind:drawGeojsonData
			bind:showZoneForm
			{demEntries}
			{streetViewLineData}
			{streetViewPointData}
			{streetViewPoint}
			{showMapCanvas}
			{setPoint}
		/>

		<HeaderMenu
			bind:featureMenuData
			bind:inputSearchWord
			{layerEntries}
			bind:showSelectionMarker
			bind:selectionMarkerLngLat
		/>
		<FooterMenu {layerEntries} />
		<LayerStyleMenu bind:layerEntry={isStyleEditEntry} bind:tempLayerEntries />
		<FeatureMenu bind:featureMenuData {layerEntries} />
		<PreviewMenu bind:showDataEntry />

		{#if !showDataEntry && !showZoneForm}
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
			bind:showAngleMarker
			{setPoint}
		/>
	</div>
{/if}
<UploadDialog
	bind:showDialogType
	bind:showDataEntry
	bind:tempLayerEntries
	bind:dropFile
	bind:showZoneForm
	{selectedEpsgCode}
/>
<ZoneForm bind:showZoneForm bind:selectedEpsgCode />

<Tooltip />
<SideMenu />
<NotificationMessage />
<InfoDialog />
<TermsOfServiceDialog />
<ScreenGuard />

<ConfirmationDialog />

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'F3') {
			DEBUG_MODE.set(!$DEBUG_MODE);
		}
	}}
/>

<style>
</style>
