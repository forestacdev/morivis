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
	const isGeoImageMain = (file: File): boolean => /\.(png|jpe?g|tiff?)$/i.test(file.name);
	const isGeoImageRelated = (file: File): boolean =>
		/\.(png|jpe?g|tiff?|tfw|tifw|tiffw|pgw|jgw|wld|aux\.xml)$/i.test(file.name);

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
				case 'png':
				case 'jpg':
				case 'jpeg':
					showDialogType = 'geotiff';
					return;
				case 'tfw':
				case 'tifw':
				case 'tiffw':
				case 'pgw':
				case 'jgw':
				case 'wld':
					showNotification('画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください', 'error');
					return;
				default:
					// aux.xmlの判定（拡張子がxmlでもファイル名が.aux.xmlで終わる場合）
					if (file.name.toLowerCase().endsWith('.aux.xml')) {
						showNotification('画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください', 'error');
						return;
					}
					showNotification('対応していないファイル形式です', 'error');
					return;
			}
		} else if (file instanceof FileList) {
			const files = Array.from(file);
			if (files.some(isShapeFileRelated)) {
				showDialogType = 'shp';
			} else if (files.some(isGeoImageRelated)) {
				if (!files.some(isGeoImageMain)) {
					// 補助ファイルのみ → 画像ファイルと一緒にドロップするよう促す
					showNotification('画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください', 'error');
					return;
				}
				showDialogType = 'geotiff';
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
