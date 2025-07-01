<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type { LngLat, MapMouseEvent, Popup, MapGeoJSONFeature } from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';

	import { mapStore } from '$routes/store/map';
	import { showLabelLayer } from '$routes/store/layers';

	import { poiLayersIds } from '$routes/map/utils/layers/poi';
	import PoiMarker from '$routes/map/components/marker/PoiMarker.svelte';
	import type { FeatureMenuData } from '$routes/map/types';
	import { throttle } from 'es-toolkit';
	import type { GeoDataEntry } from '$routes/map/data/types';

	interface Props {
		map: maplibregl.Map;
		featureMenuData: FeatureMenuData | null;
		showDataEntry: GeoDataEntry | null;
	}

	interface PoiData {
		featureId: string;
		propId: string;
		coordinates: [number, number];
		properties: {
			[name: string]: any;
		};
	}

	let { map, featureMenuData = $bindable(), showDataEntry }: Props = $props();

	let poiDatas = $state<PoiData[]>([]);
	let clickId = $state<number | null>(null); // クリックされたPOIのID

	const updateMarkers = () => {
		if (!$showLabelLayer || !map.getLayer(poiLayersIds[0])) return;

		const features = map.queryRenderedFeatures({ layers: poiLayersIds });

		const featureDataArray: PoiData[] = [];

		for (let i = 0; i < features.length; i++) {
			const feature = features[i];
			const props = feature.properties;

			// Point geometryかどうかをチェック
			if (feature.geometry.type !== 'Point') {
				continue;
			}

			const coords = feature.geometry.coordinates as [number, number];
			const propId = props._prop_id;
			const featureId = feature.id as string;

			if (propId) {
				featureDataArray.push({
					featureId: featureId,
					propId: propId,
					coordinates: coords,
					properties: props
				});
			}
		}

		poiDatas = featureDataArray;
	};

	const updateThrottle = throttle(() => {
		updateMarkers();
	}, 100);

	const onClick = (featureId: number) => {
		const poiData = poiDatas.find((data) => data.featureId === featureId);
		if (!poiData) return;
		const { coordinates, properties } = poiData;
		featureMenuData = {
			layerId: 'fac_poi',
			featureId: featureId,
			properties: properties,
			point: coordinates
		};

		clickId = featureId;

		mapStore.panToPoi(new maplibregl.LngLat(coordinates[0], coordinates[1]));
	};

	$effect(() => {
		if (!featureMenuData) {
			clickId = null;
		}
	});

	onMount(() => {
		// NOTE: 初期読み込み時のエラーを防ぐため、レイヤーが読み込まれるまで待つ
		mapStore.onload((e) => {
			updateThrottle();
			map.on('move', updateThrottle);
		});
	});

	onDestroy(() => {
		if (!map) return;
	});
</script>

{#if $showLabelLayer && !showDataEntry}
	{#each poiDatas as poiData (poiData.propId)}
		<PoiMarker
			{map}
			lngLat={new maplibregl.LngLat(poiData.coordinates[0], poiData.coordinates[1])}
			properties={poiData.properties}
			featureId={poiData.featureId}
			onClick={(featureId) => onClick(featureId)}
			{clickId}
		/>
	{/each}
{/if}

<style>
</style>
