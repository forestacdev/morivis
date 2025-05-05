<script lang="ts">
	import turfBbox from '@turf/bbox';
	import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
	import maplibregl from 'maplibre-gl';

	import { createGeoJsonEntry } from '$routes/data';
	import type { GeoDataEntry } from '$routes/data/types';
	import type { VectorEntryGeometryType } from '$routes/data/types/vector';
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

	const getLayerType = (geometryType: VectorEntryGeometryType): LayerType => {
		switch (geometryType) {
			case 'Point':
				return 'point';
			case 'LineString':
				return 'line';
			case 'Polygon':
				return 'polygon';
			default:
				return 'point';
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
		tempLayerEntries = [...tempLayerEntries, entry];

		if (entry && entry.metaData.bounds) {
			groupedLayerStore.add(entry.id, getLayerType(entryGeometryType), entry);
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
