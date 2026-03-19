<script lang="ts">
	import maplibregl from 'maplibre-gl';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		map: maplibregl.Map;
		isDragover: boolean;
		dropFile: File | FileList | null;
		tempLayerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		showZoneForm: boolean;
		focusBbox: [number, number, number, number] | null;
	}

	let {
		map,
		isDragover = $bindable(),
		dropFile = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		showZoneForm = $bindable(),
		focusBbox = $bindable()
	}: Props = $props();

	const isShapeFileRelated = (file: File): boolean => /\.(shp|dbf|prj|shx)$/i.test(file.name);

	const setFile = (file: File | FileList) => {
		if (file instanceof File) {
			const ext = file.name.split('.').pop()?.toLowerCase();

			switch (ext) {
				case 'csv':
					showDialogType = 'csv';
					return;
				case 'geojson':
				case 'fgb':
					showDialogType = 'geojson';
					return;
				case 'gpx':
					showDialogType = 'gpx';
					return;
				case 'dm':
					showDialogType = 'dm';
					return;
				case 'dxf':
					showDialogType = 'dxf';
					return;
				case 'sim':
					showDialogType = 'sima';
					return;
				case 'shp':
				case 'dbf':
				case 'shx':
				case 'prj':
					showDialogType = 'shp';
					return;
				case 'gpkg':
					showDialogType = 'gpkg';
					return;
				case 'pmtiles':
					showDialogType = 'pmtiles';
					return;
				case 'glb':
					showDialogType = 'glb';
					return;
				case 'h5':
					showDialogType = 'hdf5';
					return;
				case 'tiff':
				case 'tif':
					showDialogType = 'geotiff';
					return;
				default:
					showNotification('対応していないファイル形式です', 'error');
					return;
			}
		} else if (file instanceof FileList) {
			const files = Array.from(file);
			if (files.some(isShapeFileRelated)) {
				showDialogType = 'shp';
			} else {
				setFile(files[0]);
			}
		}
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
