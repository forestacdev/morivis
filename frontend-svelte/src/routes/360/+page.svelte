<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import * as pmtiles from 'pmtiles';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import styleJson from '$lib/json/fac_style.json';
	import ThreeCanvas from './three/canvas.svelte';
	import turfDistance from '@turf/distance';
	import turfBearing from '@turf/bearing';
	import turfBooleanPointOnLine from '@turf/boolean-point-on-line';
	import turfBooleanCrosses from '@turf/boolean-crosses';
	import turfBuffer from '@turf/buffer';
	import turfNearestPoint from '@turf/nearest-point';
	import AngleMarker from './AngleMarker.svelte';

	import { page } from '$app/stores';

	const LINE_GEOJSON_URL =
		'https://raw.githubusercontent.com/forestacdev/ensyurin-webgis-data/main/geojson/THETA360_line.geojson';
	// const LINE_GEOJSON_URL = 'http://127.0.0.1:8081/geojson/THETA360_line.geojson';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
	let mapContainer: HTMLDivElement;
	// let markerContainer: HTMLDivElement;
	let mapInstance: maplibregl.Map | null = null;
	let feature: any;
	let pointsData = {
		type: 'FeatureCollection',
		features: []
	};
	let lineData = {
		type: 'FeatureCollection',
		features: []
	};

	let nextPointData = [];

	let cameraBearing = 0;

	let angleMarker = null;

	const setPoint = (point) => {
		feature = point;

		const urlSearchParams = $page.url.searchParams;
		urlSearchParams.set('imageId', point.properties['ID']);

		history.replaceState(history.state, '', $page.url);

		const targetPoint = point;

		const buffer = turfBuffer(targetPoint, 0.001, { units: 'kilometers' });

		const targetLines = lineData.features.filter((line) => {
			return turfBooleanCrosses(buffer, line);
		});

		if (!mapInstance) return;

		// mapInstance.flyTo({
		// 	center: targetPoint.geometry.coordinates,
		// 	zoom: 18,
		// 	speed: 1.5,
		// 	curve: 1
		// });

		mapInstance.panTo(targetPoint.geometry.coordinates, {
			duration: 1000,
			animate: true,
			zoom: mapInstance.getZoom() > 18 ? mapInstance.getZoom() : 18
		});

		if (angleMarker) {
			angleMarker.remove();
		}
		const markerContainer = document.createElement('div');
		new AngleMarker({
			target: markerContainer,
			props: {
				cameraBearing: cameraBearing
			}
		});

		// console.log(markerContainer);

		angleMarker = new maplibregl.Marker({
			element: markerContainer,
			pitchAlignment: 'map',
			rotationAlignment: 'map'
		})
			.setLngLat(targetPoint.geometry.coordinates)
			.addTo(mapInstance);

		const nextData = [];

		targetLines.forEach((line) => {
			const crosses = findFarthestVertex(targetPoint, line);
			const nextPoint = turfNearestPoint(crosses, pointsData);

			const bearing = turfBearing(targetPoint, nextPoint);
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

	onMount(async () => {
		const style = styleJson;

		pointsData = await fetch(
			'https://raw.githubusercontent.com/forestacdev/ensyurin-webgis-data/main/geojson/THETA360.geojson'
		)
			.then((res) => res.json())
			.then((data) => {
				return data;
			});

		console.log(LINE_GEOJSON_URL);

		lineData = await fetch(LINE_GEOJSON_URL)
			.then((res) => res.json())
			.then((data) => {
				return data;
			});

		style.sources['terrain'] = gsiTerrainSource;
		style.sources['360'] = {
			type: 'geojson',
			data: pointsData
		};

		style.sources['360_line'] = {
			type: 'geojson',
			data: lineData
		};

		style.layers.push({
			id: '360',
			type: 'circle',
			source: '360',
			paint: {
				'circle-radius': 10,
				'circle-color': '#ff0000',
				'circle-opacity': 0.7,
				'circle-stroke-width': 2,
				'circle-stroke-color': '#ffffff'
			}
		});

		style.layers.push({
			id: '360_line',
			type: 'line',
			source: '360_line',
			paint: {
				'line-color': '#ff0000',
				'line-width': 2
			}
		});

		mapInstance = new maplibregl.Map({
			container: mapContainer,
			style: style,
			center: [136.923004009, 35.5509525769706],
			zoom: 14.5,
			// maxZoom: 18,
			maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
		});

		mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');
		// 3D地形コントロール
		mapInstance.addControl(
			new maplibregl.TerrainControl({
				source: 'terrain',
				exaggeration: 1
			}),
			'top-right'
		);

		mapInstance.on('click', (e) => {});

		mapInstance.on('move', () => {});

		mapInstance.on('load', () => {
			const urlSearchParams = $page.url.searchParams;
			const id = urlSearchParams.get('imageId') ?? '0';

			if (id) {
				const targetPoint = pointsData.features.find((point) => {
					return point.properties['ID'] === id;
				});

				if (targetPoint) {
					mapInstance.flyTo({
						center: targetPoint.geometry.coordinates,
						zoom: 18,
						speed: 1.5,
						curve: 1
					});
				}

				setPoint(targetPoint);
			}
		});

		mapInstance.on('click', '360', (e) => {
			console.log(e.features[0].properties);

			setPoint(e.features[0]);
		});
	});

	$: {
		if (cameraBearing && angleMarker) {
			const markerContainer = angleMarker.getElement().firstElementChild;
			markerContainer.style.transform = `rotateZ(${-cameraBearing}deg)`;
		}
	}

	const nextPoint = (e) => {
		setPoint(e.detail);
	};
</script>

<div class="relative flex h-full w-full">
	<div bind:this={mapContainer} class="h-full w-full"></div>

	<ThreeCanvas {feature} {nextPointData} on:nextPoint={nextPoint} bind:cameraBearing />
</div>

<div class="absolute left-2 top-2 z-50 z-50">{cameraBearing}</div>
<!-- <AngleMarker {cameraBearing} /> -->
