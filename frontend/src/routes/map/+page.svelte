<script lang="ts">
	import turfBearing from '@turf/bearing';

	import { delay } from 'es-toolkit';
	import type { FeatureCollection } from 'geojson';
	import maplibregl from 'maplibre-gl';
	import type { LngLat } from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';

	import DataMenu from '$routes/map/components/data_menu/DataMenu.svelte';
	// import DrawMenu from '$routes/map/components/draw_menu/DrawMenu.svelte';
	import FeatureMenu from '$routes/map/components/feature_menu/FeatureMenu.svelte';
	import HeaderMenu from '$routes/map/components/Header.svelte';
	import LayerMenu from '$routes/map/components/layer_menu/LayerMenu.svelte';
	import LayerStyleMenu from '$routes/map/components/layer_style_menu/LayerStyleMenu.svelte';
	import MapLibreMap from '$routes/map/components/Map.svelte';
	import NotificationMessage from '$routes/map/components/NotificationMessage.svelte';
	import DataPreview from '$routes/map/components/preview_menu/DataPreview.svelte';
	import PreviewMenu from '$routes/map/components/preview_menu/PreviewMenu.svelte';
	import SearchMenu from '$routes/map/components/search_menu/SearchMenu.svelte';
	import SearchSuggest from '$routes/map/components/search_menu/SearchSuggest.svelte';
	import OtherMenu from '$routes/map/components/OtherMenu.svelte';

	import StreetViewCanvas from '$routes/map/components/street_view/ThreeCanvas.svelte';

	import Tooltip from '$routes/map/components/Tooltip.svelte';
	import UploadDialog from '$routes/map/components/upload/BaseDialog.svelte';
	import { STREET_VIEW_DATA_PATH } from '$routes/constants';
	import { geoDataEntries } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { isStreetView, mapMode, selectedLayerId, isStyleEdit, isDebugMode } from '$routes/stores';
	import { activeLayerIdsStore, showStreetViewLayer } from '$routes/stores/layers';
	import { isTerrain3d, mapStore } from '$routes/stores/map';
	import { isBlocked, showLayerMenu, showOtherMenu } from '$routes/stores/ui';
	import type { DrawGeojsonData } from '$routes/map/types/draw';
	import { type FeatureMenuData, type DialogType } from '$routes/map/types';
	import { getFgbToGeojson } from '$routes/map/utils/file/geojson';
	import { get3dParams, getParams, getStreetViewParams } from '$routes/map/utils/params';
	import type { RasterEntry, RasterDemStyle } from '$routes/map/data/types/raster';
	import ConfirmationDialog from '$routes/map/components/dialog/ConfirmationDialog.svelte';
	import type { NextPointData, StreetViewPoint, StreetViewPointGeoJson } from './types/street-view';
	import ZoneForm from '$routes/map/components/upload/form/ZoneForm.svelte';
	import type { EpsgCode } from '$routes/map/utils/proj/dict';
	import Processing from './Processing.svelte';
	import { slide } from 'svelte/transition';
	import type { ResultData } from './utils/feature';
	import MobileFooter from '$routes/map/components/mobile/Footer.svelte';
	import { PCFShadowMap } from 'three';

	let map: maplibregl.Map | null = $state(null); // MapLibreのマップオブジェクト

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
	let selectedEpsgCode = $state<EpsgCode>('6675'); //
	let focusBbox = $state<[number, number, number, number] | null>(null); // フォーカスするバウンディングボックス
	// 初期化完了のフラグ
	let isInitialized = $state<boolean>(false);
	let results = $state<ResultData[] | null>([]);

	onMount(async () => {
		const params = getParams(location.search);

		if (params) {
			if (params.debug && params.debug === '1') {
				isDebugMode.set(true);
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

		// TODO ストリートビューのパラメータを取得

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

		mapStore.onload(() => {
			const terrain3d = get3dParams();
			if (terrain3d === '1') {
				mapStore.toggleTerrain(true);
				isTerrain3d.set(true);
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

		const pointLngLat = new maplibregl.LngLat(
			point.geometry.coordinates[0],
			point.geometry.coordinates[1]
		);

		if ($isStreetView) {
			mapStore.setCamera(pointLngLat);
			mapStore.panTo(point.geometry.coordinates, {
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

	// TODO: ストリートビュー用のクリックイベント
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
			mapStore.setCamera(pointLngLat);
			mapStore.easeTo({
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

			mapStore.setBearing(0);
			mapStore.setPitch(0);
			mapStore.setZoom(18);
			$mapMode = 'small';
			isBlocked.set(false);
		} else {
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
	<div class="relative flex h-dvh w-full flex-col">
		<!-- <HeaderMenu
			{resetlayerEntries}
			bind:featureMenuData
			bind:inputSearchWord
			bind:results
			{layerEntries}
			bind:showSelectionMarker
			bind:selectionMarkerLngLat
		/> -->
		<div class="flex w-full flex-1">
			<!-- マップのオフセット調整用 -->
			{#if $showLayerMenu}
				<div
					in:slide={{ duration: 1, delay: 200, axis: 'x' }}
					class="bg-main w-side-menu flex h-full shrink-0 flex-col max-lg:hidden"
				></div>
			{/if}

			<LayerMenu bind:layerEntries bind:tempLayerEntries bind:showDataEntry {resetlayerEntries} />

			<!-- スマホ用その他メニュー -->
			<div class="relative h-full w-full lg:hidden {$showOtherMenu ? 'block' : 'hidden'}">
				<OtherMenu />
			</div>

			<!-- <DrawMenu bind:layerEntries bind:drawGeojsonData /> -->
			<div class="flex w-full flex-1 flex-col overflow-hidden">
				<!-- 上部余白 -->
				<div class="bg-main w-full p-2 max-lg:hidden"></div>

				<MapLibreMap
					bind:maplibreMap={map}
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
					bind:focusBbox
					{selectedEpsgCode}
					{demEntries}
					{streetViewLineData}
					{streetViewPointData}
					{streetViewPoint}
					{showMapCanvas}
					{setPoint}
				/>

				<HeaderMenu
					{resetlayerEntries}
					bind:featureMenuData
					bind:inputSearchWord
					bind:results
					{layerEntries}
					bind:showSelectionMarker
					bind:selectionMarkerLngLat
				/>
			</div>
			<!-- 右側余白 -->
			<div class="bg-main p-2 max-lg:hidden"></div>
		</div>

		<!-- フッター余白 出典表示 -->
		<div
			class="bg-main w-full shrink-0 p-1 pr-4 text-end text-xs font-light text-white/80 max-lg:hidden"
		>
			国土地理院, © OpenMapTiles, © OpenStreetMap contributors © U.S. Geological Survey
		</div>

		<SearchMenu
			bind:featureMenuData
			bind:inputSearchWord
			{layerEntries}
			bind:showSelectionMarker
			bind:selectionMarkerLngLat
			bind:results
		/>

		<SearchSuggest
			bind:featureMenuData
			bind:inputSearchWord
			{layerEntries}
			bind:showSelectionMarker
			bind:selectionMarkerLngLat
		/>

		<LayerStyleMenu bind:layerEntry={isStyleEditEntry} bind:tempLayerEntries />
		<FeatureMenu bind:featureMenuData {layerEntries} bind:showSelectionMarker />
		<PreviewMenu bind:showDataEntry />

		{#if !showDataEntry && !showZoneForm}
			<DataMenu bind:showDataEntry bind:dropFile bind:showDialogType />
		{/if}
		{#if showDataEntry}
			<DataPreview bind:showDataEntry bind:tempLayerEntries />
		{/if}

		{#if $isStreetView}
			<StreetViewCanvas
				{streetViewPoint}
				{nextPointData}
				{showThreeCanvas}
				bind:cameraBearing
				bind:showAngleMarker
				{setPoint}
			/>
		{/if}

		<MobileFooter {showDataEntry} />
	</div>
{/if}
<UploadDialog
	bind:showDialogType
	bind:showDataEntry
	bind:tempLayerEntries
	bind:dropFile
	bind:showZoneForm
	bind:focusBbox
	{selectedEpsgCode}
/>

{#if map}
	<ZoneForm {map} bind:showZoneForm bind:selectedEpsgCode bind:focusBbox />
{/if}

<Tooltip />

<!-- PC用その他メニュー -->
<div class="max-lg:hidden">
	<OtherMenu />
</div>
<NotificationMessage />

<Processing />
<ConfirmationDialog />

<!-- TODO -->
<!-- <svelte:window
	onkeydown={(e) => {
		if (e.key === 'F3') {
			isDebugMode.set(!$isDebugMode);
		}
	}}
/> -->

<style>
</style>
