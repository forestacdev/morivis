<script lang="ts">
	import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
	import maplibregl from 'maplibre-gl';

	import type { DialogType } from '$routes/map/+page.svelte';
	import { createGeoJsonEntry } from '$routes/map/data';
	import { geometryTypeToEntryType } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { LayerType } from '$routes/store/layers';
	import { groupedLayerStore } from '$routes/store/layers';
	import { showNotification } from '$routes/store/notification';
	import { csvFileToGeojson } from '$routes/map/utils/file/csv';
	import { fgbFileToGeojson } from '$routes/map/utils/file/fgb';
	import { geoJsonFileToGeoJson } from '$routes/map/utils/file/geojson';
	import { shpFileToGeojson } from '$routes/map/utils/file/shp';

	interface Props {
		map: maplibregl.Map;
		isDragover: boolean;
		dropFile: File | FileList | null;
		tempLayerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
	}

	let {
		map,
		isDragover = $bindable(),
		dropFile = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(),
		showDialogType = $bindable()
	}: Props = $props();

	let fileName = $state<string>('');

	const setFile = async (file: File | FileList) => {
		let geojsonData: FeatureCollection<Geometry, GeoJsonProperties> | null = null;
		if (file instanceof File) {
			const ext = file.name.split('.').pop()?.toLowerCase();
			fileName = file.name;

			switch (ext) {
				// TODO:CSV
				// case 'csv':
				// 	geojsonData = await csvFileToGeojson(file);
				// 	break;
				case 'geojson':
					geojsonData = await geoJsonFileToGeoJson(file);
					break;
				case 'fgb':
					geojsonData = await fgbFileToGeojson(file);
					break;
				case 'gpx':
					showDialogType = 'gpx';
					return;
				case 'shp':
				case 'dbf':
				case 'shx':
				case 'prj':
					showDialogType = 'shp';
					return;
				case 'tiff':
				case 'tif':
					showDialogType = 'tiff';
					return;

				default:
					showNotification('対応していないファイル形式です', 'error');
					return;
			}
		} else if (file instanceof FileList) {
			// すべのファイルの拡張子を取得
			let shpFile: File | undefined;
			let dbfFile: File | undefined;
			let prjFile: File | undefined;

			// .shp .dbf .prj のファイルを探して File オブジェクトを取得
			for (let i = 0; i < file.length; i++) {
				const f = file[i];
				if (f.name.endsWith('.shp')) {
					shpFile = f;
				} else if (f.name.endsWith('.dbf')) {
					dbfFile = f;
				} else if (f.name.endsWith('.prj')) {
					prjFile = f;
				}
			}

			if (shpFile && dbfFile && prjFile) {
				geojsonData = await shpFileToGeojson(shpFile, dbfFile, prjFile);
				fileName = shpFile.name;
			} else if (shpFile || dbfFile || prjFile) {
				showDialogType = 'shp';
				return;
			} else {
				setFile(file[0]);
				return;
			}
		}

		const entryGeometryType = geometryTypeToEntryType(geojsonData);

		if (!entryGeometryType) {
			showNotification('対応していないジオメトリタイプです', 'error');
			return;
		}

		const entry = createGeoJsonEntry(geojsonData, entryGeometryType, fileName);

		if (!entry) {
			showNotification('データが不正です', 'error');
			return;
		}

		showDataEntry = entry;

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
