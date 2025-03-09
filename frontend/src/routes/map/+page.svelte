<script lang="ts" module>
	import type { NearestPoint } from '@turf/nearest-point';
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
</script>

<script lang="ts">
	// import Header from '$routes/map/components/_Header.svelte';

	import turfBearing from '@turf/bearing';
	import turfDistance from '@turf/distance';
	import turfNearestPoint from '@turf/nearest-point';
	import { delay } from 'es-toolkit';
	import type { FeatureCollection } from 'geojson';
	import maplibregl from 'maplibre-gl';
	import type {
		StyleSpecification,
		MapGeoJSONFeature,
		SourceSpecification,
		CanvasSourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		BackgroundLayerSpecification,
		GeoJSONSourceSpecification,
		Marker,
		LngLat,
		Popup
	} from 'maplibre-gl';
	import { onMount, mount } from 'svelte';

	import DataMenu from '$map/components/dataMenu/_Index.svelte';
	import InfoDialog from '$map/components/dialog/InfoDialog.svelte';
	import TermsOfServiceDialog from '$map/components/dialog/TermsOfServiceDialog.svelte';
	import FooterMenu from '$map/components/footer/_Index.svelte.svelte';
	import LayerMenu from '$map/components/layerMenu/_Index.svelte';
	import Map from '$map/components/Map.svelte';
	import SideMenu from '$map/components/sideMenu/_Index.svelte';
	import nodeConnectionsJson from '$map/components/streetView/node_connections.json';
	import StreetViewCanvas from '$map/components/streetView/ThreeCanvas.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import DebugControl from '$map/debug/_Index.svelte';
	import { mapStore } from '$map/store/map';
	import { getGeojson, getFgbToGeojson } from '$map/utils/geojson';
	import { setStreetViewParams, getStreetViewParams } from '$map/utils/params';
	import AngleMarker from '$routes/map/components/streetView/AngleMarker.svelte';
	import {
		addedLayerIds,
		selectedLayerId,
		clickableVectorIds,
		clickableRasterIds,
		DEBUG_MODE,
		selectedHighlightData,
		isStreetView,
		mapMode
	} from '$routes/map/store';

	type NodeConnections = Record<string, string[]>;

	// 型を適用
	const nodeConnections: NodeConnections = nodeConnectionsJson;

	let tempLayerEntries = $state<GeoDataEntry[]>([]); // 一時レイヤーデータ
	let layerEntries = $state<GeoDataEntry[]>([]); // レイヤーデータ

	// ストリートビューのデータ
	let nextPointData = $state<NextPointData[] | null>(null);
	let angleMarker = $state<Marker | null>(null); // マーカー
	let streetViewPoint = $state<any>(null);
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

	onMount(async () => {
		streetViewPointData = (await getGeojson(
			'./streetView/THETA360.geojson'
		)) as StreetViewPointGeoJson;

		streetViewLineData = await getFgbToGeojson('./streetView/links.fgb');

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
			$isStreetView = true;
		}
	});

	// ストリートビューのデータの取得
	const setPoint = async (point: StreetViewPoint) => {
		if (!point) return;
		const pointId = point.properties['ID'];

		setStreetViewParams(pointId);

		const nextPoints = (nodeConnections[pointId] || [])
			.map((id) => streetViewPointData.features.find((point) => point.properties['ID'] === id))
			.filter((nextPoint): nextPoint is StreetViewPoint => nextPoint !== undefined)
			.map((nextPoint) => ({
				featureData: nextPoint,
				bearing: turfBearing(point, nextPoint)
			}));
		const map = mapStore.getMap();

		if (!map) return;

		if ($isStreetView) {
			map.panTo(point.geometry.coordinates, {
				duration: 1000,
				animate: true,
				zoom: map.getZoom() > 18 ? map.getZoom() : (18 as number)
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
			.addTo(map);

		if (markerContainer) markerContainer.style.transform = `rotateZ(${-cameraBearing + 180}deg)`;

		nextPointData = nextPoints;
		streetViewPoint = point;
	};

	// マーカーの回転
	$effect(() => {
		if (cameraBearing && angleMarker) {
			const markerContainer = angleMarker.getElement().firstElementChild;
			if (markerContainer) markerContainer.style.transform = `rotateZ(${-cameraBearing + 180}deg)`;
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

	// streetビューの表示切り替え時
	isStreetView.subscribe(async (value) => {
		const map = mapStore.getMap();
		if (!map) return;
		if (value) {
			// map.setCenter(angleMarker._lngLat, {
			// 	zoom: map.getZoom() > 18 ? map.getZoom() : 18
			// });
			map.setPaintProperty('@street_view_line_layer', 'line-opacity', 1);

			map.easeTo({
				center: streetViewPoint.geometry.coordinates,
				zoom: 20,
				duration: 500,
				bearing: (cameraBearing + 180) % 360,
				pitch: 65
			});

			await delay(500);
			showMapCanvas = false;
			showThreeCanvas = true;

			await delay(500);

			map.setBearing(0);
			map.setPitch(0);
			$mapMode = 'small';
		} else {
			map.setPaintProperty('@street_view_line_layer', 'line-opacity', 0);

			$mapMode = 'view';
			showMapCanvas = true;
			showThreeCanvas = false;

			await delay(300);

			// マップを移動
			map.easeTo({
				zoom: 17,
				duration: 500
			});
		}
	});
	$inspect(nextPointData);
</script>

<div class="bg-base relative flex h-full w-full flex-grow">
	<LayerMenu bind:layerEntries bind:tempLayerEntries />
	<Map
		bind:layerEntries
		bind:tempLayerEntries
		{streetViewLineData}
		{streetViewPointData}
		{angleMarker}
		{streetViewPoint}
		{showMapCanvas}
	/>
	<FooterMenu {layerEntries} />
	<DataMenu />
	<StreetViewCanvas
		{streetViewPoint}
		{nextPointData}
		{showThreeCanvas}
		bind:cameraBearing
		{setPoint}
	/>
</div>
<SideMenu />
<InfoDialog />
<TermsOfServiceDialog />

<DebugControl />

<style>
</style>
