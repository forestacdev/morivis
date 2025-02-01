<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Feature, FeatureCollection, Geometry, GeoJsonProperties, GeoJSON } from 'geojson';
	import type { MapGeoJSONFeature } from 'maplibre-gl';
	import { onMount } from 'svelte';

	import Compass from '$map/components/control/Compass.svelte';
	import type { GeoDataEntry } from '$map/data/types';
	import { mapStore } from '$map/store/map';

	interface ResultData {
		name: string;
		features: Feature<Geometry, { [key: string]: any }>[];
		layerId: string;
	}

	let results = $state<ResultData[] | null>([]);

	onMount(() => {});

	let {
		layerEntries
	}: {
		layerEntries: GeoDataEntry[];
	} = $props();
</script>

<div
	class="bg-main absolute bottom-0 left-0 z-20 flex w-full flex-grow items-center justify-start gap-2 p-2"
>
	<Compass />
	フッターメニュー
</div>

<style>
</style>
