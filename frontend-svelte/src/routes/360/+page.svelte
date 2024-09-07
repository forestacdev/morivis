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

	import { page } from '$app/stores';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
	let mapContainer: HTMLDivElement;
	let mapInstance: maplibregl.Map | null = null;
	let imageUrl: string = '';
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

	const setImage = (point) => {
		console.log(`${IMAGE_URL}${point.properties['Name']}`);
		imageUrl = `${IMAGE_URL}${point.properties['Name']}`;

		const urlSearchParams = $page.url.searchParams;
		urlSearchParams.set('imageId', point.properties['ID']);

		history.replaceState(history.state, '', $page.url);

		const targetPoint = point;

		const buffer = turfBuffer(targetPoint, 0.0001, { units: 'kilometers' });

		const targetLines = lineData.features.filter((line) => {
			return turfBooleanCrosses(buffer, line);
		});

		if (!mapInstance) return;

		mapInstance.flyTo({
			center: targetPoint.geometry.coordinates,
			zoom: 18,
			speed: 1.5,
			curve: 1
		});

		const nextData = [];

		targetLines.forEach((line) => {
			const crosses = findFarthestVertex(targetPoint, line);
			const nextPoint = turfNearestPoint(crosses, pointsData);
			// const targetPoint = pointsData.features.find((point) => {
			// 	return (
			// 		point.geometry.coordinates[0] === nextPoint.geometry.coordinates[0] &&
			// 		point.geometry.coordinates[1] === nextPoint.geometry.coordinates[1]
			// 	);
			// });
			const bearing = turfBearing(targetPoint, nextPoint);
			nextData.push({
				feaureData: nextPoint,
				bearing: bearing
			});
		});

		nextPointData = nextData;
	};

	const IMAGE_URL = 'https://raw.githubusercontent.com/forestacdev/theta360-Images/main/images/';

	// 各ラインの最も遠い頂点を抽出する関数
	function findFarthestVertex(point, line) {
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
	}

	onMount(async () => {
		const style = styleJson;

		pointsData = await fetch(
			'https://raw.githubusercontent.com/forestacdev/ensyurin-webgis-data/main/geojson/THETA360.geojson'
		)
			.then((res) => res.json())
			.then((data) => {
				return data;
			});

		lineData = await fetch(
			'https://raw.githubusercontent.com/forestacdev/ensyurin-webgis-data/main/geojson/THETA360_line.geojson'
		)
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

		// map.on('load', () => {
		// 	// TerrainControlの追加
		// 	map.addControl(
		// 		new maplibregl.TerrainControl({
		// 			source: 'terrain', // 地形ソースを指定
		// 			exaggeration: 1 // 高さの倍率
		// 		}),
		// 		'top-right' // コントロールの位置を指定
		// 	);
		// });

		mapInstance.on('click', (e) => {
			// map.queryRenderedFeatures(e.point).forEach((feature) => {
			// 	console.log(feature.layer);
			// });
		});

		mapInstance.on('load', () => {
			console.log('load');
			const urlSearchParams = $page.url.searchParams;
			const id = urlSearchParams.get('imageId') ?? '0';
			console.log(id);
			if (id) {
				const targetPoint = pointsData.features.find((point) => {
					return point.properties['ID'] === id;
				});

				console.log(targetPoint);

				if (targetPoint) {
					mapInstance.flyTo({
						center: targetPoint.geometry.coordinates,
						zoom: 18,
						speed: 1.5,
						curve: 1
					});
				}

				setImage(targetPoint);
			}
		});

		mapInstance.on('click', '360', (e) => {
			console.log(e.features[0].properties);

			setImage(e.features[0]);

			// console.log(targetLines);

			// const nearbyPoints = pointsData.features.filter((point) => {
			// 	const distance = turfDistance(targetPoint, point, { units: 'meters' });
			// 	return distance <= 12;
			// });

			// 各点の方位を計算
			// nearbyPoints.forEach((point) => {
			// 	const bearing = turfBearing(targetPoint, point);
			// 	console.log(bearing);
			// });

			// console.log(nearbyPoints);
		});
	});

	const nextPoint = (e) => {
		console.log(e.detail);
		setImage(e.detail);
	};
</script>

<div class="relative flex h-full w-full">
	<div bind:this={mapContainer} class="h-full w-full"></div>

	<ThreeCanvas {imageUrl} {nextPointData} on:nextPoint={nextPoint} bind:cameraBearing />
</div>

<div class="absolute left-2 top-2 z-50 z-50">{cameraBearing}</div>
