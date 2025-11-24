<script lang="ts">
	import turfBearing from '@turf/bearing';

	import { delay } from 'es-toolkit';
	import type { FeatureCollection, Point } from 'geojson';
	import maplibregl from 'maplibre-gl';
	import type { LngLat } from 'maplibre-gl';
	import { onMount, onDestroy } from 'svelte';

	import DataMenu from '$routes/map/components/data_menu/DataMenu.svelte';

	import FeatureMenu from '$routes/map/components/feature_menu/FeatureMenu.svelte';
	import SearchFeatureMenu from '$routes/map/components/feature_menu/SearchFeatureMenu.svelte';
	import HeaderMenu from '$routes/map/components/Header.svelte';
	import LayerMenu from '$routes/map/components/layer_menu/LayerMenu.svelte';
	import LayerStyleMenu from '$routes/map/components/layer_style_menu/LayerStyleMenu.svelte';
	import MapLibreMap from '$routes/map/components/Map.svelte';
	import Footer from '$routes/map/components/Footer.svelte';
	import NotificationMessage from '$routes/map/components/NotificationMessage.svelte';
	import DataPreviewDialog from '$routes/map/components/preview_menu/DataPreviewDialog.svelte';
	import PreviewMenu from '$routes/map/components/preview_menu/PreviewMenu.svelte';
	import SearchMenu from '$routes/map/components/search_menu/SearchMenu.svelte';
	import OtherMenu from '$routes/map/components/OtherMenu.svelte';

	import StreetViewCanvas from '$routes/map/components/street_view/ThreeCanvas.svelte';

	import Tooltip from '$routes/map/components/Tooltip.svelte';
	import UploadDialog from '$routes/map/components/upload/BaseDialog.svelte';
	import { ENTRY_PMTILES_VECTOR_PATH, STREET_VIEW_DATA_PATH } from '$routes/constants';
	import { geoDataEntries } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { isStreetView, mapMode, selectedLayerId, isStyleEdit, isDebugMode } from '$routes/stores';
	import { activeLayerIdsStore, showStreetViewLayer } from '$routes/stores/layers';
	import { isTerrain3d, mapStore } from '$routes/stores/map';
	import {
		isBlocked,
		showDataMenu,
		showLayerMenu,
		showOtherMenu,
		showInfoDialog,
		showSearchMenu,
		showTermsDialog
	} from '$routes/stores/ui';
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
	import type {
		ResultAddressData,
		ResultCoordinateData,
		ResultData,
		ResultLayerData,
		ResultPoiData,
		SearchGeojsonData
	} from './utils/feature';
	import MobileFooter from '$routes/map/components/mobile/Footer.svelte';
	import MobileFeatureMenuCard from '$routes/map/components/mobile/FeatureMenuCard.svelte';
	import MobileFeatureMenuContents from '$routes/map/components/mobile/FeatureMenuContents.svelte';
	import { checkPc } from './utils/ui';
	import { page } from '$app/state';
	import { getPropertiesFromPMTiles } from './utils/pmtiles';
	import { lonLatToTileCoords } from './utils/tile';
	import { getWikipediaArticle, type WikiArticle } from './api/wikipedia';
	import { normalizeSchoolName } from './utils/normalized';
	import { result } from 'es-toolkit/compat';

	let map = $state.raw<maplibregl.Map | null>(null); // MapLibreのマップオブジェクト

	let tempLayerEntries = $state<GeoDataEntry[]>([]); // 一時レイヤーデータ

	const getLayerEntriesData = (): GeoDataEntry[] => {
		// tempが空の場合は定数のみ返す
		if (tempLayerEntries.length === 0) {
			return geoDataEntries;
		}
		return [...geoDataEntries, ...tempLayerEntries];
	};

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
	let wikiMenuData = $state<WikiArticle | null>(null);

	// 選択マーカー
	let showSelectionMarker = $state<boolean>(false); // マーカーの表示
	let selectionMarkerLngLat = $state<LngLat | null>(null); // マーカーの位置

	// ストリートビューのマーカー
	let showAngleMarker = $state<boolean>(false); // マーカーの表示
	let angleMarkerLngLat = $state<LngLat>(new maplibregl.LngLat(0, 0)); // マーカーの位置

	let showDialogType = $state<DialogType>(null);
	let showDebugWindow = $state<boolean>(false); // デバッグウィンドウの表示
	let showZoneForm = $state<boolean>(false); // 座標系フォームの表示状態
	let selectedEpsgCode = $state<EpsgCode>('6675'); //
	let focusBbox = $state<[number, number, number, number] | null>(null); // フォーカスするバウンディングボックス

	// 検索ワード
	let inputSearchWord = $state<string>('');
	let searchResults = $state<ResultData[] | null>([]);
	let selectedSearchId = $state<number | null>(null);
	let selectedSearchResultData = $state<ResultPoiData | ResultAddressData | null>(null);

	$effect(() => {
		if (selectedSearchId) {
			mapStore.setFilter('@search_result', ['!=', ['id'], selectedSearchId]);
			mapStore.setFilter('@search_result_label', ['!=', ['id'], selectedSearchId]);
		} else {
			mapStore.setFilter('@search_result', null);
			mapStore.setFilter('@search_result_label', null);
		}
	});

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
		streetViewPointData = (await getFgbToGeojson(
			`${STREET_VIEW_DATA_PATH}/nodes.fgb`
		)) as StreetViewPointGeoJson;

		streetViewLineData = await getFgbToGeojson(`${STREET_VIEW_DATA_PATH}/links.fgb`);

		nodeConnectionsJson = await fetch(`${STREET_VIEW_DATA_PATH}/node_connections.json`).then(
			(res) => res.json()
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

		mapStore.onload(() => {
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
				layer = getLayerEntriesData().find((entry) => entry.id === id);

				if (layer) {
					// layerEntriesData から取得したオブジェクトを、初期状態として追加

					newLayerEntries.push(layer);
				}
			}
		}

		// 新しいデータで再レンダリング。
		layerEntries = newLayerEntries;
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

	const focusFeature = async (result: ResultPoiData | ResultAddressData) => {
		if (result.type === 'poi') {
			const tileCoords = lonLatToTileCoords(
				result.point[0],
				result.point[1],
				14 // ズームレベル
			);
			const prop = await getPropertiesFromPMTiles(
				`${ENTRY_PMTILES_VECTOR_PATH}/fac_search.pmtiles`,
				tileCoords,
				result.layerId,
				result.featureId
			);

			const data: FeatureMenuData = {
				layerId: result.layerId,
				properties: prop,
				point: result.point,
				featureId: result.featureId
			};
			featureMenuData = data;
		}

		// TODO
		if (result.type === 'address') {
			selectedSearchResultData = result;
		}

		//github.com/maplibre/maplibre-gl-js/issues/4891
		mapStore.flyTo(new maplibregl.LngLat(result.point[0], result.point[1]), {
			zoom: 17,
			duration: 800
		});

		// selectionMarkerLngLat = new maplibregl.LngLat(result.point[0], result.point[1]);
		// showSelectionMarker = true;
	};

	onDestroy(() => {
		// コンポーネントが破棄されるときに実行される処理
		isInitialized = false;
	});

	$effect(() => {
		if (!selectedSearchId) {
			selectedSearchResultData = null;
		} else if (searchResults && selectedSearchId) {
			const result = searchResults.find((res) => res.id === selectedSearchId);
			if (result && (result.type === 'poi' || result.type === 'address')) {
				selectedSearchResultData = result as ResultPoiData | ResultAddressData;
			}
		}
	});
</script>

{#if isInitialized && isInitialStreetViewEntry}
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
				{resetlayerEntries}
			/>

			<!-- 左側余白 -->
			{#if !$showLayerMenu}
				<div class="bg-main p-2 max-lg:hidden"></div>
			{/if}

			<!-- スマホ用その他メニュー -->
			<div
				class="absolute z-10 h-full w-full lg:hidden {$showOtherMenu
					? 'opacity-500 pointer-events-auto'
					: 'pointer-events-none opacity-0'}"
			>
				<OtherMenu />
			</div>

			<!-- <DrawMenu bind:layerEntries bind:drawGeojsonData /> -->
			<div class="flex w-full flex-1 flex-col overflow-hidden">
				<!-- 上部余白 -->
				<!-- <div class="bg-main w-full p-2 max-lg:hidden"></div> -->
				<HeaderMenu
					{resetlayerEntries}
					{focusFeature}
					bind:featureMenuData
					bind:selectedSearchResultData
					bind:inputSearchWord
					bind:searchResults
					{layerEntries}
					bind:showSelectionMarker
					bind:selectionMarkerLngLat
					bind:showDataEntry
				/>

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
					bind:isExternalCameraUpdate
					bind:selectedSearchId
					bind:selectedSearchResultData
					{selectedEpsgCode}
					{demEntries}
					{streetViewLineData}
					{streetViewPointData}
					{streetViewPoint}
					{showMapCanvas}
					{searchGeojsonData}
					{focusFeature}
				/>
			</div>
			<!-- 右側余白 -->
			<div class="bg-main p-2 max-lg:hidden"></div>
		</div>

		<!-- フッター -->
		<Footer />

		<SearchMenu
			bind:featureMenuData
			bind:inputSearchWord
			{layerEntries}
			bind:showSelectionMarker
			bind:selectionMarkerLngLat
			bind:searchResults
			bind:searchGeojsonData
			{selectedSearchId}
			{focusFeature}
		/>

		<LayerStyleMenu bind:layerEntry={isStyleEditEntry} bind:tempLayerEntries />
		<FeatureMenu bind:featureMenuData {layerEntries} bind:showSelectionMarker />
		<SearchFeatureMenu bind:selectedSearchResultData />

		<!-- スマホ用地物情報 -->
		<MobileFeatureMenuCard bind:featureMenuData {layerEntries} bind:showSelectionMarker>
			<MobileFeatureMenuContents bind:featureMenuData {layerEntries} bind:showSelectionMarker />
		</MobileFeatureMenuCard>

		<PreviewMenu bind:showDataEntry />

		{#if !showDataEntry && !showZoneForm}
			<DataMenu bind:showDataEntry bind:dropFile bind:showDialogType />
		{/if}
		{#if showDataEntry}
			<DataPreviewDialog bind:showDataEntry bind:tempLayerEntries />
		{/if}

		<StreetViewCanvas
			{streetViewPoint}
			{nextPointData}
			{showThreeCanvas}
			bind:cameraBearing
			bind:showAngleMarker
			bind:isExternalCameraUpdate
		/>

		<MobileFooter {showDataEntry} {featureMenuData} />
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

			if (featureMenuData) {
				featureMenuData = null;
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
