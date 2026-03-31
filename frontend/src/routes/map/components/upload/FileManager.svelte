<script lang="ts">
	import JSZip from 'jszip';
	import maplibregl from 'maplibre-gl';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import { SUPPORTED_FILE_EXTENSIONS, type DialogType } from '$routes/map/types';
	import { hasExifGps } from '$routes/map/utils/file/exif';
	import { isGtfsZip } from '$routes/map/utils/file/gtfs';
	import { showConfirmDialog } from '$routes/stores/confirmation';
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

	const isShapeFileRelated = (file: File): boolean => /\.(shp|dbf|prj|shx|cpg)$/i.test(file.name);
	const isGeoImageMain = (file: File): boolean => /\.(png|jpe?g|webp|tiff?)$/i.test(file.name);
	const isGeoImageRelated = (file: File): boolean =>
		/\.(png|jpe?g|webp|tiff?|tfw|tifw|tiffw|pgw|jgw|wld|aux\.xml)$/i.test(file.name);

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

	/** XMLファイルの先頭を読んでGMLかどうかを判定 */
	const isGmlXml = async (file: File): Promise<boolean> => {
		try {
			const header = await file.slice(0, 2000).text();
			return (
				header.includes('gml:') ||
				header.includes('xmlns:gml') ||
				header.includes('opengis.net/gml')
			);
		} catch {
			return false;
		}
	};

	/** XMLファイルの先頭を読んでLandXMLかどうかを判定 */
	const isLandXml = async (file: File): Promise<boolean> => {
		try {
			const header = await file.slice(0, 2000).text();
			return header.includes('<LandXML') || header.includes('landxml.org');
		} catch {
			return false;
		}
	};

	/** XMLファイルの先頭を読んで法務局地図XMLかどうかを判定 */
	const isMojXml = async (file: File): Promise<boolean> => {
		try {
			const header = await file.slice(0, 2000).text();
			return header.includes('moj.go.jp/MINJI/tizuxml');
		} catch {
			return false;
		}
	};

	const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB

	/** ファイルサイズをフォーマット */
	const formatSize = (bytes: number): string => {
		if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
		if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / 1024).toFixed(0)} KB`;
	};

	/** 大きなファイルの場合に確認ダイアログを表示。キャンセルならfalseを返す */
	const checkLargeFile = async (files: File | File[]): Promise<boolean> => {
		const fileList = Array.isArray(files) ? files : [files];
		const totalSize = fileList.reduce((sum, f) => sum + f.size, 0);
		if (totalSize < LARGE_FILE_THRESHOLD) return true;

		return showConfirmDialog({
			message: `ファイルサイズが大きいです（${formatSize(totalSize)}）。動作が不安定になる可能性があります。続行しますか？`,
			confirmText: '続行',
			cancelText: 'キャンセル'
		});
	};

	const setFile = async (file: File | FileList) => {
		if (file instanceof File) {
			// 大きなファイルの確認
			if (!(await checkLargeFile(file))) return;

			const ext = file.name.split('.').pop()?.toLowerCase();

			switch (ext) {
				case 'zip': {
					// GTFS ZIPかどうか先に判定
					if (await isGtfsZip(file)) {
						showDialogType = 'gtfs';
						return;
					}
					// ZIPを展開してFileListとして再処理
					try {
						const zip = await JSZip.loadAsync(file);
						const extracted: File[] = [];
						const entries: [string, import('jszip').JSZipObject][] = [];
						zip.forEach((path, entry) => {
							if (!entry.dir) entries.push([path, entry]);
						});
						for (const [path, entry] of entries) {
							const blob = await entry.async('blob');
							const fileName = path.split('/').pop() ?? path;
							extracted.push(new File([blob], fileName, { type: blob.type }));
						}
						if (extracted.length > 0) {
							const dt = new DataTransfer();
							extracted.forEach((f) => dt.items.add(f));
							setFile(dt.files);
							return;
						}
					} catch {
						// 展開失敗
					}
					showNotification('ZIP内に対応するファイルが見つかりません', 'error');
					return;
				}
				case 'csv':
					showDialogType = 'csv';
					return;
				case 'geojson':
				case 'fgb':
					showDialogType = 'geojson';
					return;
				case 'topojson':
					showDialogType = 'topojson';
					return;
				case 'gpx':
					showDialogType = 'gpx';
					return;
				case 'gml':
					showDialogType = 'gml';
					return;
				case 'kml':
				case 'kmz':
					showDialogType = 'kml';
					return;
				case 'landxml':
					showDialogType = 'landxml';
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
				case 'cpg':
					showDialogType = 'shp';
					return;
				case 'gpkg':
					showDialogType = 'gpkg';
					return;
				case 'pmtiles':
					showDialogType = 'pmtiles';
					return;
				case 'glb':
				case 'obj':
					showDialogType = 'glb';
					return;
				case 'h5':
					showDialogType = 'hdf5';
					return;
				case 'jpg':
				case 'jpeg':
				case 'heic':
				case 'heif':
					// EXIF GPSがあれば位置情報付き写真として処理
					if (await hasExifGps(file)) {
						showDialogType = 'geophoto';
						return;
					}
					showDialogType = 'geopdf';
					return;
				case 'tiff':
				case 'tif':
				case 'png':
				case 'webp':
				case 'pdf':
					showDialogType = 'geopdf';
					return;
				case 'las':
				case 'laz':
				case 'ply':
				case 'pcd':
				case 'xyz':
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

				case 'mtl':
					showNotification('OBJファイル(.obj)と一緒にドロップしてください', 'error');
					return;
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
					// GML判定
					if (await isGmlXml(file)) {
						showDialogType = 'gml';
						return;
					}
					// LandXML判定
					if (await isLandXml(file)) {
						showDialogType = 'landxml';
						return;
					}
					// 法務局地図XML判定
					if (await isMojXml(file)) {
						showDialogType = 'mojxml';
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

			// 大きなファイルの確認
			if (!(await checkLargeFile(files))) return;

			if (files.some((f) => /\.obj$/i.test(f.name))) {
				showDialogType = 'glb';
			} else if (files.every((f) => /\.(jpe?g|heic|heif)$/i.test(f.name))) {
				// 全ファイルがJPEG/HEIC → 1枚でもGPS付きなら位置情報付き写真
				const hasGps = await hasExifGps(files[0]);
				if (hasGps) {
					showDialogType = 'geophoto';
				} else {
					// GPS無し → 通常の画像として最初のファイルを処理
					setFile(files[0]);
					return;
				}
			} else if (files.some(isShapeFileRelated)) {
				showDialogType = 'shp';
			} else if (files.some(isGeoImageRelated)) {
				if (!files.some(isGeoImageMain)) {
					showNotification('画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください', 'error');
					return;
				}
				showDialogType = 'geotiff';
			} else if (files.every((f) => /\.xml$/i.test(f.name))) {
				// 複数XMLファイル → 先頭ファイルでDEM/GML判定
				if (await isDemXml(files[0])) {
					showDialogType = 'demxml';
				} else if (await isGmlXml(files[0])) {
					showDialogType = 'gml';
				} else if (await isLandXml(files[0])) {
					showDialogType = 'landxml';
				} else if (await isMojXml(files[0])) {
					showDialogType = 'mojxml';
				} else {
					showNotification('対応していないXMLファイルです', 'error');
				}
			} else {
				// 対応ファイルを探して最初にマッチしたものを処理
				const supportedFile = files.find((f) => {
					const ext = '.' + (f.name.split('.').pop()?.toLowerCase() ?? '');
					return SUPPORTED_FILE_EXTENSIONS.includes(ext);
				});
				if (supportedFile) {
					setFile(supportedFile);
				} else {
					showNotification('対応していないファイル形式です', 'error');
				}
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
