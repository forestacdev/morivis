<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type { LngLat, MapMouseEvent, Popup, MapGeoJSONFeature } from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';

	import { mapStore } from '$routes/store/map';
	import { showLabelLayer } from '$routes/store/layers';

	import { poiLayersIds } from '$routes/utils/layers/poi';
	import PoiMarker from '$routes/components/marker/PoiMarker.svelte';
	import type { FeatureMenuData } from '$routes/types';

	interface Props {
		map: maplibregl.Map;
		featureMenuData: FeatureMenuData | null;
	}

	interface PoiData {
		featureId: string;
		propId: string;
		coordinates: [number, number];
		properties: {
			[name: string]: any;
		};
	}

	let { map, featureMenuData = $bindable() }: Props = $props();

	let poiDatas = $state<PoiData[]>([]);

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

	const onClick = (featureId: string) => {
		const poiData = poiDatas.find((data) => data.featureId === featureId);
		if (!poiData) return;
		const { coordinates, properties } = poiData;
		featureMenuData = {
			layerId: 'fac_poi',
			featureId: properties._prop_id,
			properties: properties,
			point: coordinates
		};
	};

	onMount(() => {
		// NOTE: 初期読み込み時のエラーを防ぐため、レイヤーが読み込まれるまで待つ
		mapStore.onload((e) => {
			updateMarkers();
			map.on('move', updateMarkers);
		});
	});

	onDestroy(() => {
		if (!map) return;
	});
</script>

{#if $showLabelLayer}
	{#each poiDatas as poiData (poiData.propId)}
		<PoiMarker
			{map}
			lngLat={new maplibregl.LngLat(poiData.coordinates[0], poiData.coordinates[1])}
			properties={poiData.properties}
			featureId={poiData.featureId}
			onClick={(featureId) => onClick(featureId)}
		/>
	{/each}
{/if}

<style>
</style>
