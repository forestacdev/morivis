<script lang="ts">
	import JSZip from 'jszip';
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

	/** ZIPファイルの中身を判定してDialogTypeを返す */
	const detectZipContent = async (file: File): Promise<DialogType> => {
		try {
			const zip = await JSZip.loadAsync(file);
			const fileNames: string[] = [];
			zip.forEach((path, entry) => {
				if (!entry.dir) fileNames.push(path); // 元のパスを保持
			});

			// shpファイルがあればシェープファイル
			if (fileNames.some((f) => f.toLowerCase().endsWith('.shp'))) return 'shp';

			// XMLファイルがあれば中身を確認してDEM判定
			const xmlName = fileNames.find((f) => f.toLowerCase().endsWith('.xml'));
			if (xmlName) {
				const xmlContent = await zip.file(xmlName)?.async('string');
				if (xmlContent) {
					const header = xmlContent.slice(0, 2000);
					const hasDem = header.includes('<DEM') || header.includes('dataset:DEM');
					const hasDataset = header.includes('<Dataset') || header.includes('dataset:Dataset');
					if (hasDem && hasDataset) return 'demxml';
				}
			}

			return null;
		} catch {
			return null;
		}
	};

	/** XMLファイルの先頭を読んで基盤地図情報DEMかどうかを判定 */
	const isDemXml = async (file: File): Promise<boolean> => {
		try {
			const header = await file.slice(0, 2000).text();
			// 名前空間プレフィックスあり/なし両方に対応
			const hasDem = header.includes('<DEM') || header.includes('dataset:DEM');
			const hasDataset = header.includes('<Dataset') || header.includes('dataset:Dataset');
			return hasDem && hasDataset;
		} catch {
			return false;
		}
	};

	const setFile = async (file: File | FileList) => {
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
				case 'las':
				case 'laz':
				case 'ply':
				case 'pcd':
					showDialogType = 'pointcloud';
					return;
				case 'mbtiles':
					showDialogType = 'mbtiles';
					return;
				case 'nc':
				case 'nc4':
					showDialogType = 'netcdf';
					return;
				case 'bin':
				case 'grib2':
				case 'grb2':
				case 'grb':
					showDialogType = 'grib2';
					return;
				case 'zip': {
					console.warn('[FileManager] entering zip case');
					const zipType = await detectZipContent(file);
					console.warn('[FileManager] zip detected type:', zipType);
					if (zipType) {
						showDialogType = zipType;
					} else {
						showNotification('ZIP内に対応するファイルが見つかりません', 'error');
					}
					return;
				}
				case 'tfw':
				case 'tifw':
				case 'tiffw':
				case 'pgw':
				case 'jgw':
				case 'wld':
					showNotification('画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください', 'error');
					return;
				case 'xml':
					// aux.xmlの判定
					if (file.name.toLowerCase().endsWith('.aux.xml')) {
						showNotification('画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください', 'error');
						return;
					}
					// 基盤地図情報DEM XMLの判定
					if (await isDemXml(file)) {
						showDialogType = 'demxml';
						return;
					}
					showNotification('対応していないXMLファイルです', 'error');
					return;
				default:
					showNotification('対応していないファイル形式です', 'error');
					return;
			}
		} else if (file instanceof FileList) {
			const files = Array.from(file);

			if (files.some(isShapeFileRelated)) {
				showDialogType = 'shp';
			} else if (files.some(isGeoImageRelated)) {
				if (!files.some(isGeoImageMain)) {
					showNotification('画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください', 'error');
					return;
				}
				showDialogType = 'geotiff';
			} else if (files.every((f) => /\.xml$/i.test(f.name))) {
				// 複数XMLファイル → 先頭ファイルでDEM判定
				if (await isDemXml(files[0])) {
					showDialogType = 'demxml';
				} else {
					showNotification('対応していないXMLファイルです', 'error');
				}
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
