import JSZip from 'jszip';

import type { DialogType } from '$routes/map/types';
import { hasExifGps } from '$routes/map/utils/formats/exif';
import { isFileGdbRelatedFile } from '$routes/map/utils/formats/filegdb';
import { hasGeoRssMarker } from '$routes/map/utils/formats/georss';
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
import type { EpsgCode } from '$routes/map/utils/proj/dict';
import { getMatchedExtension } from '$routes/map/utils/upload-matchers-common';
import {
	areAllPhotoFiles,
	areAllXmlFiles,
	findFirstByExtensions,
	findFirstSupportedFile,
	hasAnyExtension,
	hasExtension,
	hasKnownExtension,
	isGtfsTextSet,
	isShapeFileRelated,
	MODEL_FILE_EXTENSIONS
} from './upload-drop-matchers';

type UploadDropDecision =
	| {
		type: 'dialog';
		dialogType: DialogType;
		dropFiles?: File[] | null;
	}
	| {
		type: 'notification';
		level: 'error' | 'info' | 'warning' | 'success';
		message: string;
	}
	| {
		type: 'remote-kml-model';
		name: string;
		modelUrl: string;
		placement?: {
			lng: number;
			lat: number;
			altitude: number;
			scale?: number;
		};
	};

type UploadDropRule = {
	id: string;
	match: (files: File[]) => boolean;
	resolve: (files: File[]) => Promise<UploadDropDecision>;
};

// FileManager 側で state 更新しやすいよう、判定結果を UI 遷移の形にそろえる。
const createDialogDecision = (
	dialogType: DialogType,
	dropFiles?: File[] | null
): UploadDropDecision => ({
	type: 'dialog',
	dialogType,
	dropFiles
});

const createNotificationDecision = (
	message: string,
	level: 'error' | 'info' | 'warning' | 'success' = 'error'
): UploadDropDecision => ({
	type: 'notification',
	level,
	message
});

const attachProjectedModelEpsg = (file: File, projectedModelEpsg: EpsgCode | null) => {
	if (!projectedModelEpsg) return;

	Object.defineProperty(file, 'morivisProjectedModelEpsg', {
		value: projectedModelEpsg,
		configurable: true
	});
};

// ZIP の中身を File[] に展開し、以降は通常の複数ファイル判定へ合流させる。
const unzipFiles = async (file: File): Promise<File[]> => {
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

	return extracted;
};

// XML は拡張子だけでは足りないので、先頭だけ読んで DEM / GML / LandXML / 法務局XML を分ける。
const resolveXmlFiles = async (files: File[]): Promise<UploadDropDecision> => {
	const targetFile = files[0];
	if (!targetFile) {
		return createNotificationDecision('対応していないXMLファイルです');
	}

	try {
		const header = await targetFile.slice(0, 2000).text();

		if (hasGeoRssMarker(header)) {
			return createDialogDecision('georss');
		}

		if (header.includes('<DEM') || header.includes('dataset:DEM')) {
			const hasDataset = header.includes('<Dataset') || header.includes('dataset:Dataset');
			if (hasDataset) return createDialogDecision('demxml');
		}

		if (
			header.includes('gml:')
			|| header.includes('xmlns:gml')
			|| header.includes('opengis.net/gml')
		) {
			return createDialogDecision('gml');
		}

		if (header.includes('<LandXML') || header.includes('landxml.org')) {
			return createDialogDecision('landxml');
		}

		if (header.includes('moj.go.jp/MINJI/tizuxml')) {
			return createDialogDecision('mojxml');
		}
	} catch {
		return createNotificationDecision('対応していないXMLファイルです');
	}

	return createNotificationDecision('対応していないXMLファイルです');
};

// 単体ファイルで同期的に決められるものは、ここに拡張子 -> ダイアログ種別として寄せる。
const SINGLE_FILE_DIALOG_BY_EXTENSION: Record<string, DialogType> = {
	csv: 'csv',
	tsv: 'tsv',
	xlsx: 'xlsx',
	wkt: 'wkt',
	ewkt: 'wkt',
	topojson: 'topojson',
	parquet: 'geoparquet',
	geoparquet: 'geoparquet',
	arrow: 'geoarrow',
	feather: 'geoarrow',
	mif: 'mif',
	mid: 'mif',
	gpx: 'gpx',
	tcx: 'tcx',
	osm: 'osm',
	gml: 'gml',
	landxml: 'landxml',
	bz2: 'hrit',
	lrit: 'hrit',
	hrit: 'hrit',
	mt: 'drm',
	dm: 'dm',
	dwg: 'dwg',
	dxf: 'dxf',
	sfc: 'sxf',
	sim: 'sima',
	shp: 'shp',
	dbf: 'shp',
	shx: 'shp',
	prj: 'shp',
	cpg: 'shp',
	gpkg: 'gpkg',
	sqlite: 'sqlite',
	sqlite3: 'sqlite',
	db: 'sqlite',
	db3: 'sqlite',
	sql: 'sqlite',
	gdb: 'gdb',
	pmtiles: 'pmtiles',
	glb: 'glb',
	'3ds': 'glb',
	dae: 'glb',
	'3dm': 'glb',
	fbx: 'glb',
	drc: 'glb',
	'3mf': 'glb',
	amf: 'glb',
	ifc: 'glb',
	h5: 'hdf5',
	tiff: 'geotiff',
	tif: 'geotiff',
	svg: 'svg',
	png: 'geopdf',
	webp: 'geopdf',
	pdf: 'geopdf',
	las: 'pointcloud',
	laz: 'pointcloud',
	ply: 'pointcloud',
	pcd: 'pointcloud',
	xyz: 'pointcloud',
	mbtiles: 'mbtiles',
	nc: 'netcdf',
	nc4: 'netcdf',
	bin: 'grib2',
	grib2: 'grib2',
	grb2: 'grib2',
	grb: 'grib2'
};

const SXF_PRIMARY_EXTENSION = '.sfc';
const SXF_P21_EXTENSION = '.p21';
const SXF_SAF_EXTENSION = '.saf';

// 複数ファイルドロップ専用ルール。上から優先順に評価する。
const MULTI_FILE_RULES: UploadDropRule[] = [
	{
		id: 'kml-model',
		match: (files) => files.some((file) => hasExtension(file, '.kml')),
		resolve: async (files) => {
			const kmlFile = files.find((file) => hasExtension(file, '.kml'));
			if (!kmlFile) {
				return createNotificationDecision('KMLファイルの判定に失敗しました');
			}

			const kmlModel = await extractModelFromKml(kmlFile, files).catch(() => null);
			if (kmlModel?.modelUrl) {
				return {
					type: 'remote-kml-model',
					name: kmlModel.placement?.name?.trim() || kmlFile.name.replace(/\.[^.]+$/, ''),
					modelUrl: kmlModel.modelUrl,
					placement: kmlModel.placement
				};
			}

			if (kmlModel && kmlModel.modelFiles.length > 0) {
				return createDialogDecision('glb', kmlModel.modelFiles);
			}

			return createDialogDecision('kml');
		}
	},
	{
		id: 'model-files',
		match: (files) => !!findFirstByExtensions(files, MODEL_FILE_EXTENSIONS),
		resolve: async (files) => {
			const objFile = files.find((file) => hasExtension(file, '.obj'));
			if (!objFile) return createDialogDecision('glb');

			const inspection = await inspectObjFile(objFile);
			attachProjectedModelEpsg(objFile, inspection.projectedModelEpsg);
			return createDialogDecision(inspection.isPointCloud ? 'pointcloud' : 'glb');
		}
	},
	{
		id: 'filegdb-set',
		match: (files) => files.some((file) => isFileGdbRelatedFile(file)),
		resolve: async () => createDialogDecision('filegdb')
	},
	{
		id: 'photo-set',
		match: (files) => areAllPhotoFiles(files),
		resolve: async (files) => {
			const firstFile = files[0];
			if (!firstFile) return createNotificationDecision('対応していないファイル形式です');
			if (await hasExifGps(firstFile)) {
				return createDialogDecision('geophoto');
			}
			return await resolveDroppedFiles(firstFile);
		}
	},
	{
		id: 'drm-set',
		match: (files) => files.some((file) => hasExtension(file, '.mt')),
		resolve: async () => createDialogDecision('drm')
	},
	{
		id: 'sxf-set',
		match: (files) =>
			files.some(
				(file) =>
					hasExtension(file, SXF_PRIMARY_EXTENSION)
					|| hasExtension(file, SXF_P21_EXTENSION)
					|| hasExtension(file, SXF_SAF_EXTENSION)
			),
		resolve: async (files) => {
			const sfcFile = files.find((file) => hasExtension(file, SXF_PRIMARY_EXTENSION));
			if (sfcFile) {
				return createDialogDecision('sxf');
			}

			const p21File = files.find((file) => hasExtension(file, SXF_P21_EXTENSION));
			if (p21File) {
				return createDialogDecision('sxf');
			}

			return createNotificationDecision(
				'SXF の本体ファイル (.sfc または .p21) を一緒にドロップしてください'
			);
		}
	},
	{
		id: 'shapefile-set',
		match: (files) => files.some(isShapeFileRelated),
		resolve: async () => createDialogDecision('shp')
	},
	{
		id: 'gtfs-text-set',
		match: (files) => isGtfsTextSet(files),
		resolve: async () => createDialogDecision('gtfs')
	},
	{
		id: 'georeferenced-image',
		match: (files) => !!findGeoReferencedImageFile(files),
		resolve: async () => createDialogDecision('geotiff')
	},
	{
		id: 'raster-sidecar-only',
		match: (files) => files.some(isRasterImageSidecarFile),
		resolve: async (files) => {
			if (!findRasterImageFile(files) && !files.some(isRasterImageMainFile)) {
				return createNotificationDecision(
					'画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください'
				);
			}

			return createNotificationDecision(
				'画像ファイルと補助ファイルの組み合わせが一致しません。同じ名前の .tfw または .aux.xml を一緒にドロップしてください'
			);
		}
	},
	{
		id: 'xml-set',
		match: (files) => areAllXmlFiles(files),
		resolve: async (files) => await resolveXmlFiles(files)
	},
	{
		id: 'hrit-extensionless',
		match: () => true,
		resolve: async (files) => {
			const hritMatches = await Promise.all(
				files.map(async (file) => ({
					file,
					isHrit: !hasKnownExtension(file) && (await isLikelyHritFile(file))
				}))
			);

			if (hritMatches.some((match) => match.isHrit)) {
				return createDialogDecision('hrit', files);
			}

			const supportedFile = findFirstSupportedFile(files);
			if (supportedFile) {
				return await resolveDroppedFiles(supportedFile);
			}

			return createNotificationDecision('対応していないファイル形式です');
		}
	}
];

// 単体ドロップ用の本体。特殊判定だけ if に残し、それ以外は拡張子表へ落とす。
const resolveSingleFile = async (file: File): Promise<UploadDropDecision> => {
	const ext = file.name.split('.').pop()?.toLowerCase();

	if (ext === 'zip') {
		if (await isGtfsZip(file)) {
			return createDialogDecision('gtfs');
		}

		try {
			const extracted = await unzipFiles(file);
			if (extracted.length > 0) {
				return await resolveDroppedFiles(extracted);
			}
		} catch {
			return createNotificationDecision('ZIP内に対応するファイルが見つかりません');
		}

		return createNotificationDecision('ZIP内に対応するファイルが見つかりません');
	}

	if (ext === 'json' || ext === 'geojson' || ext === 'fgb') {
		if (ext === 'json' && (await isLocationHistoryFile(file))) {
			return createDialogDecision('locationhistory');
		}
		if ((ext === 'json' || ext === 'geojson') && (await isMfJsonFile(file))) {
			return createDialogDecision('mfjson');
		}
		return createDialogDecision('geojson');
	}

	if (ext === 'kml') {
		const kmlModel = await extractModelFromKml(file).catch(() => null);
		if (kmlModel?.modelUrl) {
			return {
				type: 'remote-kml-model',
				name: kmlModel.placement?.name?.trim() || file.name.replace(/\.[^.]+$/, ''),
				modelUrl: kmlModel.modelUrl,
				placement: kmlModel.placement
			};
		}
		return createDialogDecision('kml');
	}

	if (ext === 'kmz') {
		const kmzModel = await extractModelFromKmz(file).catch(() => null);
		if (kmzModel && kmzModel.modelFiles.length > 0) {
			return createDialogDecision('glb', kmzModel.modelFiles);
		}
		return createDialogDecision('kml');
	}

	if (ext === 'obj') {
		const inspection = await inspectObjFile(file);
		attachProjectedModelEpsg(file, inspection.projectedModelEpsg);
		return createDialogDecision(inspection.isPointCloud ? 'pointcloud' : 'glb');
	}

	if (ext === 'jpg' || ext === 'jpeg' || ext === 'heic' || ext === 'heif') {
		if (await hasExifGps(file)) {
			return createDialogDecision('geophoto');
		}
		return createDialogDecision('geopdf');
	}

	if (ext === 'txt') {
		if (await isPointCloudTextFile(file)) {
			return createDialogDecision('pointcloud');
		}
		return createNotificationDecision('対応していないTXTファイルです');
	}

	if (ext === 'p21') {
		return createDialogDecision('sxf');
	}

	if (ext === 'saf') {
		return createNotificationDecision(
			'SXF の本体ファイル (.sfc または .p21) を一緒にドロップしてください'
		);
	}

	if (ext === 'xml') {
		if (file.name.toLowerCase().endsWith('.aux.xml')) {
			return createNotificationDecision(
				'画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください'
			);
		}
		return await resolveXmlFiles([file]);
	}

	if (ext === 'rss' || ext === 'atom' || ext === 'georss') {
		return await resolveXmlFiles([file]);
	}

	if (
		ext === 'mtl'
		|| ext === 'tfw'
		|| ext === 'tifw'
		|| ext === 'tiffw'
		|| ext === 'pgw'
		|| ext === 'jgw'
		|| ext === 'wld'
	) {
		return createNotificationDecision(
			ext === 'mtl'
				? 'OBJファイル(.obj)と一緒にドロップしてください'
				: '画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください'
		);
	}

	if (ext && ext in SINGLE_FILE_DIALOG_BY_EXTENSION) {
		return createDialogDecision(SINGLE_FILE_DIALOG_BY_EXTENSION[ext]);
	}

	if (!hasKnownExtension(file) && (await isLikelyHritFile(file))) {
		return createDialogDecision('hrit');
	}

	return createNotificationDecision('対応していないファイル形式です');
};

// 複数ドロップ用の本体。KML+モデル、Shapefile 一式、GeoTIFF+sidecar などをここで扱う。
const resolveMultipleFiles = async (files: File[]): Promise<UploadDropDecision> => {
	for (const rule of MULTI_FILE_RULES) {
		if (!rule.match(files)) continue;
		return await rule.resolve(files);
	}

	return createNotificationDecision('対応していないファイル形式です');
};

// FileManager から呼ぶ公開入口。単体と複数の分岐だけをここで吸収する。
export const resolveDroppedFiles = async (
	input: File | File[]
): Promise<UploadDropDecision> => {
	if (Array.isArray(input)) {
		if (input.length === 0) {
			return createNotificationDecision('対応していないファイル形式です');
		}
		return await resolveMultipleFiles(input);
	}

	return await resolveSingleFile(input);
};
