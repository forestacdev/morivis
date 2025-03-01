<script lang="ts">
	// import Header from '$routes/map/components/_Header.svelte';

	import turfBearing from '@turf/bearing';
	import turfBooleanCrosses from '@turf/boolean-crosses';
	import turfBuffer from '@turf/buffer';
	import turfDistance from '@turf/distance';
	import turfNearestPoint from '@turf/nearest-point';
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
	import StreetViewCanvas from '$map/components/streetView/ThreeCanvas.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import DebugControl from '$map/debug/_Index.svelte';
	import { mapStore } from '$map/store/map';
	import { getGeojson } from '$map/utils/geojson';
	import { setStreetViewParams, getStreetViewParams } from '$map/utils/params';
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

	let tempLayerEntries = $state<GeoDataEntry[]>([]); // 一時レイヤーデータ
	let layerEntries = $state<GeoDataEntry[]>([]); // レイヤーデータ

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

	onMount(async () => {
		streetViewPointData = await getGeojson('./streetView/THETA360.geojson');

		streetViewLineData = await getGeojson('./streetView/THETA360_line.geojson');

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
	const setPoint = (point) => {
		if (!point) return;
		streetViewPoint = point;

		setStreetViewParams(point.properties['ID']);

		const targetPoint = point;

		const buffer = turfBuffer(point, 0.001, { units: 'kilometers' });

		if (!buffer) return;
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

	mapStore.onClick((e) => {
		// if (!e || $mapMode === 'edit') return;
		// if (streetViewPointData.features.length > 0) {
		// 	const point = turfNearestPoint([e.lngLat.lng, e.lngLat.lat], streetViewPointData);
		// 	const distance = turfDistance(point, [e.lngLat.lng, e.lngLat.lat], { units: 'meters' });
		// 	if (distance < 100) {
		// 		// streetViewPoint = point;
		// 		setPoint(point);
		// 	}
		// }
	});
</script>

<div class="bg-base relative flex h-full w-full flex-grow">
	<LayerMenu bind:layerEntries bind:tempLayerEntries />
	<Map bind:layerEntries bind:tempLayerEntries />
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
