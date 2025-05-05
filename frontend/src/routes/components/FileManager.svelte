<script lang="ts">
	import turfBbox from '@turf/bbox';
	import maplibregl from 'maplibre-gl';

	import { createGeoJsonEntry } from '$routes/data';
	import type { GeoDataEntry } from '$routes/data/types';
	import { groupedLayerStore } from '$routes/store/layers';
	import type { LayerType } from '$routes/store/layers';
	import { showNotification } from '$routes/store/notification';
	import { csvFileToGeojson } from '$routes/utils/csv';
	import { fgbFileToGeojson } from '$routes/utils/fgb';
	import { geoJsonFileToGeoJson } from '$routes/utils/geojson';

	interface Props {
		map: maplibregl.Map;
		isDragover: boolean;
		dropFile: File | null;
		tempLayerEntries: GeoDataEntry[];
	}

	let {
		map,
		isDragover = $bindable(),
		dropFile = $bindable(),
		tempLayerEntries = $bindable()
	}: Props = $props();

	const allowedExtensions = ['csv', 'geojson', 'fgb'];

	const setFile = async (file: File) => {
		let geojsonData;
		const ext = file.name.split('.').pop()?.toLowerCase();
		if (!ext || !allowedExtensions.includes(ext)) {
			showNotification('対応していないファイル形式です', 'error');
			return;
		}
		switch (file.name.split('.').pop()?.toLowerCase()) {
			case 'csv':
				geojsonData = await csvFileToGeojson(file);
				break;
			case 'geojson':
				geojsonData = await geoJsonFileToGeoJson(file);
				break;
			case 'fgb':
				geojsonData = await fgbFileToGeojson(file);
				break;
			default:
				showNotification('対応していないファイル形式です', 'error');
		}

		const entry = createGeoJsonEntry(geojsonData, 'Point', file.name);
		tempLayerEntries = [...tempLayerEntries, entry];

		if (entry && entry.metaData.bounds) {
			groupedLayerStore.add(entry.id, 'point');
			map.fitBounds(entry.metaData.bounds, {
				padding: { top: 10, bottom: 25, left: 15, right: 5 },
				maxZoom: 20
			});
		}

		showNotification('ファイルを読み込みました', 'success');
	};

	$effect(() => {
		if (dropFile) {
			setFile(dropFile);
		}
	});
</script>

{#if isDragover}
	<div class="pointer-events-none absolute h-full w-full bg-slate-500 opacity-50"></div>
{/if}

<style>
</style>
