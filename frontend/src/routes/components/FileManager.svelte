<script lang="ts">
	import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
	import maplibregl from 'maplibre-gl';

	import { createGeoJsonEntry } from '$routes/data';
	import type { GeoDataEntry } from '$routes/data/types';
	import type { VectorEntryGeometryType } from '$routes/data/types/vector';
	import type { LayerType } from '$routes/store/layers';
	import { groupedLayerStore } from '$routes/store/layers';
	import { getLayerType } from '$routes/store/layers';
	import { showNotification } from '$routes/store/notification';
	import { csvFileToGeojson } from '$routes/utils/csv';
	import { fgbFileToGeojson } from '$routes/utils/fgb';
	import { geoJsonFileToGeoJson } from '$routes/utils/geojson';

	interface Props {
		map: maplibregl.Map;
		isDragover: boolean;
		dropFile: File | null;
		tempLayerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
	}

	let {
		map,
		isDragover = $bindable(),
		dropFile = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable()
	}: Props = $props();

	const allowedExtensions = ['csv', 'geojson', 'fgb'];

	const geometryTypeToEntryType = (
		geojson: FeatureCollection<Geometry, GeoJsonProperties>
	): VectorEntryGeometryType | undefined => {
		const geometryTypes = new Set<string>();
		geojson.features.forEach((feature) => {
			if (feature.geometry && feature.geometry.type) {
				geometryTypes.add(feature.geometry.type);
			}
		});

		if (geometryTypes.has('Point')) {
			return 'Point';
		} else if (geometryTypes.has('LineString')) {
			return 'LineString';
		} else if (geometryTypes.has('Polygon')) {
			return 'Polygon';
		} else if (geometryTypes.has('MultiPoint')) {
			return 'Point';
		} else if (geometryTypes.has('MultiLineString')) {
			return 'LineString';
		} else if (geometryTypes.has('MultiPolygon')) {
			return 'Polygon';
		}
	};

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
				return;
		}

		const entryGeometryType = geometryTypeToEntryType(geojsonData);

		if (!entryGeometryType) {
			showNotification('対応していないジオメトリタイプです', 'error');
			return;
		}

		const entry = createGeoJsonEntry(geojsonData, entryGeometryType, file.name);

		if (!entry) {
			showNotification('データが不正です', 'error');
			return;
		}

		tempLayerEntries = [...tempLayerEntries, entry];
		showDataEntry = entry;

		return;
		const layerType = getLayerType(entry);

		if (entry && entry.metaData.bounds) {
			groupedLayerStore.add(entry.id, layerType as LayerType);
			map.fitBounds(entry.metaData.bounds, {
				padding: 100,
				duration: 500
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
