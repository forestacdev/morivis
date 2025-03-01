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
	import { getGeojson } from '$map/utils/geojson';
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

	onMount(async () => {
		streetViewPointData = (await getGeojson(
			'./streetView/THETA360.geojson'
		)) as StreetViewPointGeoJson;

		streetViewLineData = await getGeojson('./streetView/link.geojson');

		// const imageId = getStreetViewParams();
		// if (imageId) {
		// 	const targetPoint = streetViewPointData.features.find((point) => {
		// 		return point.properties['ID'] === imageId;
		// 	});

		// 	if (targetPoint) {
		// 		const mapInstance = mapStore.getMap();
		// 		if (mapInstance) {
		// 			mapInstance.flyTo({
		// 				center: targetPoint.geometry.coordinates,
		// 				zoom: 18,
		// 				speed: 1.5,
		// 				curve: 1
		// 			});
		// 		}
		// 	}

		// 	setPoint(targetPoint);
		// }
	});

	// ストリートビューのデータの取得
	const setPoint = (point: StreetViewPoint) => {
		if (!point) return;
		const pointId = point.properties['ID'];
		streetViewPoint = point;

		setStreetViewParams(pointId);

		const nextPoints = (nodeConnections[pointId] || [])
			.map((id) => streetViewPointData.features.find((point) => point.properties['ID'] === id))
			.filter((nextPoint): nextPoint is StreetViewPoint => nextPoint !== undefined)
			.map((nextPoint) => ({
				featureData: nextPoint,
				bearing: turfBearing(point, nextPoint)
			}));
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

		nextPointData = nextPoints;
	};

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

	mapStore.onClick((e) => {
		if (!e || $mapMode === 'edit') return;
		if (streetViewPointData.features.length > 0) {
			const point = turfNearestPoint([e.lngLat.lng, e.lngLat.lat], streetViewPointData);
			const distance = turfDistance(point, [e.lngLat.lng, e.lngLat.lat], { units: 'meters' });
			if (distance < 100) {
				// streetViewPoint = point;
				setPoint(point);
			}
		}
	});
</script>

<div class="bg-base relative flex h-full w-full flex-grow">
	<LayerMenu bind:layerEntries bind:tempLayerEntries />
	<Map bind:layerEntries bind:tempLayerEntries {streetViewLineData} />
	<FooterMenu {layerEntries} />
	<DataMenu />
	<StreetViewCanvas feature={streetViewPoint} {nextPointData} bind:cameraBearing {setPoint} />
</div>
<SideMenu />
<InfoDialog />
<TermsOfServiceDialog />

<DebugControl />

<style>
</style>
