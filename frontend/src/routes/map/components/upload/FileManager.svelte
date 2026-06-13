<script lang="ts">
	import JSZip from 'jszip';
	import maplibregl from 'maplibre-gl';

	import { createGlbEntry } from '$routes/map/data/entries/model';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { MeshFormatType } from '$routes/map/data/types/model';
	import { SUPPORTED_FILE_EXTENSIONS, type DialogType } from '$routes/map/types';
	import { hasExifGps } from '$routes/map/utils/formats/exif';
	import { isGtfsZip } from '$routes/map/utils/formats/gtfs';
	import { isLikelyHritFile } from '$routes/map/utils/formats/hrit';
	import { extractModelFromKml, extractModelFromKmz } from '$routes/map/utils/formats/kml';
	import { isLocationHistoryFile } from '$routes/map/utils/formats/location-history';
	import { isMfJsonFile } from '$routes/map/utils/formats/mf-json';
	import { inspectObjFile } from '$routes/map/utils/formats/obj';
	import {
		findGeoReferencedImageFile,
		findRasterImageFile,
		isRasterImageMainFile,
		isRasterImageSidecarFile
	} from '$routes/map/utils/formats/raster/sidecar';
	import { isPointCloudTextFile } from '$routes/map/utils/formats/xyz';
	import { showConfirmDialog } from '$routes/stores/confirmation';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		map: maplibregl.Map;
		isDragover: boolean;
		dropFile: File | FileList | null;
		tempLayerEntries: MorivisLayerEntry[];
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		focusBbox: [number, number, number, number] | null;
	}

	let {
		map,
		isDragover = $bindable(),
		dropFile = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		focusBbox = $bindable()
	}: Props = $props();

	const isShapeFileRelated = (file: File): boolean => /\.(shp|dbf|prj|shx|cpg)$/i.test(file.name);
	const getPathLikeName = (file: File) => {
		const relativePath = (file as File & { morivisRelativePath?: string }).morivisRelativePath;
		return (relativePath ?? file.name).toLowerCase();
	};
	const hasExtension = (file: File, extension: string) => getPathLikeName(file).endsWith(extension);
	const hasKnownExtension = (file: File) => {
		const name = file.name;
		const dotIndex = name.lastIndexOf('.');
		return dotIndex > 0 && dotIndex < name.length - 1;
	};
	const isGtfsTextSet = (files: File[]) => {
		const normalizedNames = new Set(files.map((file) => file.name.toLowerCase()));
		return ['agency.txt', 'routes.txt', 'stops.txt', 'trips.txt', 'stop_times.txt'].every((name) =>
			normalizedNames.has(name)
		);
	};
	const getMeshFormatType = (path: string): MeshFormatType => {
		const normalizedPath = path.toLowerCase();
		if (normalizedPath.endsWith('.obj')) return 'obj';
		if (normalizedPath.endsWith('.3ds')) return '3ds';
		if (normalizedPath.endsWith('.dae')) return 'dae';
		if (normalizedPath.endsWith('.3dm')) return '3dm';
		if (normalizedPath.endsWith('.fbx')) return 'fbx';
		if (normalizedPath.endsWith('.drc')) return 'drc';
		if (normalizedPath.endsWith('.3mf')) return '3mf';
		if (normalizedPath.endsWith('.amf')) return 'amf';
		if (normalizedPath.endsWith('.ifc')) return 'ifc';
		return 'gltf';
	};
	const registerRemoteKmlModel = (
		name: string,
		modelUrl: string,
		placement?: {
			lng: number;
			lat: number;
			altitude: number;
			scale?: number;
		}
	) => {
		const center = map.getCenter();
		showDataEntry = createGlbEntry(
			name,
			modelUrl,
			{
				lng: placement?.lng ?? center.lng,
				lat: placement?.lat ?? center.lat,
				altitude: placement?.altitude ?? 0,
				scale: placement?.scale
			},
			getMeshFormatType(modelUrl)
		);
		showDialogType = null;
		dropFile = null;
	};
	const logDroppedFiles = (files: File[]) => {
		console.log(
			'[FileManager] dropped files',
			files.map((file) => ({
				name: file.name,
				relativePath: (file as File & { morivisRelativePath?: string }).morivisRelativePath ?? null,
				pathLikeName: getPathLikeName(file),
				size: file.size
			}))
		);
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
				case 'tsv':
					showDialogType = 'tsv';
					return;
				case 'json':
				case 'geojson':
				case 'fgb':
					if (ext === 'json' && (await isLocationHistoryFile(file))) {
						showDialogType = 'locationhistory';
						return;
					}
					if ((ext === 'json' || ext === 'geojson') && (await isMfJsonFile(file))) {
						showDialogType = 'mfjson';
						return;
					}
					showDialogType = 'geojson';
					return;
				case 'wkt':
				case 'ewkt':
					showDialogType = 'wkt';
					return;
				case 'topojson':
					showDialogType = 'topojson';
					return;
				case 'parquet':
				case 'geoparquet':
					showDialogType = 'geoparquet';
					return;
				case 'arrow':
				case 'feather':
					showDialogType = 'geoarrow';
					return;
				case 'mif':
				case 'mid':
					showDialogType = 'mif';
					return;
				case 'gpx':
					showDialogType = 'gpx';
					return;
				case 'tcx':
					showDialogType = 'tcx';
					return;
				case 'osm':
					showDialogType = 'osm';
					return;
				case 'gml':
					showDialogType = 'gml';
					return;
				case 'kml': {
					const kmlModel = await extractModelFromKml(file).catch(() => null);
					if (kmlModel?.modelUrl) {
						registerRemoteKmlModel(
							kmlModel.placement?.name?.trim() || file.name.replace(/\.[^.]+$/, ''),
							kmlModel.modelUrl,
							kmlModel.placement
						);
						return;
					}
					showDialogType = 'kml';
					return;
				}
				case 'kmz': {
					const kmzModel = await extractModelFromKmz(file).catch(() => null);
					if (kmzModel && kmzModel.modelFiles.length > 0) {
						const dt = new DataTransfer();
						kmzModel.modelFiles.forEach((modelFile) => dt.items.add(modelFile));
						dropFile = dt.files;
						showDialogType = 'glb';
						return;
					}
					showDialogType = 'kml';
					return;
				}
				case 'landxml':
					showDialogType = 'landxml';
					return;
				case 'bz2':
				case 'lrit':
				case 'hrit':
					showDialogType = 'hrit';
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
				case 'gdb':
					showDialogType = 'gdb';
					return;
				case 'pmtiles':
					showDialogType = 'pmtiles';
					return;
				case 'glb':
				case '3ds':
				case 'dae':
				case '3dm':
				case 'fbx':
				case 'drc':
				case '3mf':
				case 'amf':
				case 'ifc':
					showDialogType = 'glb';
					return;
				case 'obj': {
					const inspection = await inspectObjFile(file);
					showDialogType = inspection.isPointCloud ? 'pointcloud' : 'glb';
					return;
				}
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
					showDialogType = 'geotiff';
					return;
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
				case 'txt':
					if (await isPointCloudTextFile(file)) {
						showDialogType = 'pointcloud';
						return;
					}
					showNotification('対応していないTXTファイルです', 'error');
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
					if (!hasKnownExtension(file) && (await isLikelyHritFile(file))) {
						showDialogType = 'hrit';
						return;
					}
					showNotification('対応していないファイル形式です', 'error');
					return;
			}
		} else if (file instanceof FileList) {
			const files = Array.from(file);
			logDroppedFiles(files);

			// 大きなファイルの確認
			if (!(await checkLargeFile(files))) return;

			const kmlFile = files.find((candidate) => hasExtension(candidate, '.kml'));
			if (kmlFile) {
				const kmlModel = await extractModelFromKml(kmlFile, files).catch(() => null);
				if (kmlModel?.modelUrl) {
					registerRemoteKmlModel(
						kmlModel.placement?.name?.trim() || kmlFile.name.replace(/\.[^.]+$/, ''),
						kmlModel.modelUrl,
						kmlModel.placement
					);
					return;
				}
				if (kmlModel && kmlModel.modelFiles.length > 0) {
					const dt = new DataTransfer();
					kmlModel.modelFiles.forEach((modelFile) => dt.items.add(modelFile));
					dropFile = dt.files;
					showDialogType = 'glb';
					return;
				}
			}

			if (files.some((f) => hasExtension(f, '.obj'))) {
				const objFile = files.find((f) => hasExtension(f, '.obj'));
				if (!objFile) {
					showNotification('OBJファイルの判定に失敗しました', 'error');
					return;
				}
				const inspection = await inspectObjFile(objFile);
				showDialogType = inspection.isPointCloud ? 'pointcloud' : 'glb';
			} else if (files.some((f) => hasExtension(f, '.3ds'))) {
				showDialogType = 'glb';
			} else if (files.some((f) => hasExtension(f, '.dae'))) {
				showDialogType = 'glb';
			} else if (files.some((f) => hasExtension(f, '.3dm'))) {
				showDialogType = 'glb';
			} else if (files.some((f) => hasExtension(f, '.fbx'))) {
				showDialogType = 'glb';
			} else if (files.some((f) => hasExtension(f, '.drc'))) {
				showDialogType = 'glb';
			} else if (files.some((f) => hasExtension(f, '.3mf'))) {
				showDialogType = 'glb';
			} else if (files.some((f) => hasExtension(f, '.amf'))) {
				showDialogType = 'glb';
			} else if (files.some((f) => hasExtension(f, '.ifc'))) {
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
			} else if (isGtfsTextSet(files)) {
				showDialogType = 'gtfs';
			} else {
				const geoReferencedImageFile = findGeoReferencedImageFile(files);
				if (geoReferencedImageFile) {
					showDialogType = 'geotiff';
				} else if (files.some(isRasterImageSidecarFile)) {
					if (!findRasterImageFile(files) && !files.some(isRasterImageMainFile)) {
						showNotification('画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください', 'error');
						return;
					}

					showNotification(
						'画像ファイルと補助ファイルの組み合わせが一致しません。同じ名前の .tfw または .aux.xml を一緒にドロップしてください',
						'error'
					);
					return;
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
					const hritFiles = await Promise.all(
						files.map(async (candidate) => ({
							file: candidate,
							isHrit: !hasKnownExtension(candidate) && (await isLikelyHritFile(candidate))
						}))
					);
					if (hritFiles.some((candidate) => candidate.isHrit)) {
						dropFile = file;
						showDialogType = 'hrit';
						return;
					}

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
		}
	};

	$effect(() => {
		if (dropFile) {
			setFile(dropFile);
		}
	});
</script>

<style>
</style>
