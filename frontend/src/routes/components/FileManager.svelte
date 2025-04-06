<script lang="ts">
	import turfBbox from '@turf/bbox';
	import maplibregl from 'maplibre-gl';

	import { showNotification } from '$routes/store/notification';
	import { csvFileToGeojson } from '$routes/utils/csv';
	import { fgbFileToGeojson } from '$routes/utils/fgb';
	import { geoJsonFileToGeoJson } from '$routes/utils/geojson';

	interface Props {
		map: maplibregl.Map;
		isDragover: boolean;
		dropFile: File | null;
	}

	let { map, isDragover = $bindable(), dropFile = $bindable() }: Props = $props();

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

		showNotification('ファイルを読み込みました', 'success');

		const bounds = turfBbox(geojsonData);
		console.warn('bounds', bounds);
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
