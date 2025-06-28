<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type { LngLat, MapMouseEvent, Popup, MapGeoJSONFeature } from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';

	import { mapStore } from '$routes/store/map';
	import { showLabelLayer } from '$routes/store/layers';

	import { poiLayersIds } from '$routes/utils/layers/poi';
	import PoiMarker from '$routes/components/marker/PoiMarker.svelte';

	interface Props {
		map: maplibregl.Map;
	}

	let { map }: Props = $props();

	let poiDatas = $state<FeatureData[]>([]);

	type FeatureData = {
		id: string;
		coordinates: [number, number];
		properties: {
			[name: string]: any;
		};
	};

	const updateMarkers = () => {
		if (!$showLabelLayer || !map.getLayer(poiLayersIds[0])) return;

		const features = map.queryRenderedFeatures({ layers: poiLayersIds });

		const featureDataArray: FeatureData[] = [];

		for (let i = 0; i < features.length; i++) {
			const feature = features[i];
			const props = feature.properties;

			// Point geometryかどうかをチェック
			if (feature.geometry.type !== 'Point') {
				continue;
			}

			const coords = feature.geometry.coordinates as [number, number];
			const id = props._prop_id;

			if (id) {
				featureDataArray.push({
					id: id,
					coordinates: coords,
					properties: props
				});
			}
		}

		poiDatas = featureDataArray;
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
	{#each poiDatas as poiData (poiData.id)}
		<PoiMarker
			{map}
			lngLat={new maplibregl.LngLat(poiData.coordinates[0], poiData.coordinates[1])}
			properties={poiData.properties}
		/>
	{/each}
{/if}

<style>
</style>
