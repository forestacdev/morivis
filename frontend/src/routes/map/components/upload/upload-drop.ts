import { isGeoZarrZip, isLocalGeoZarrFolder } from '$routes/map/utils/formats/geozarr/local';
import { isJp2File } from '$routes/map/utils/formats/jpeg2000/files';
import { isMapInfoTab } from '$routes/map/utils/formats/mapinfo-tab/files';
import { isMltFile } from '$routes/map/utils/formats/mlt';
import { isLocalMvtInput } from '$routes/map/utils/formats/mvt';
import { isOsmPbfFile } from '$routes/map/utils/formats/osm-pbf/files';
import { isLocalRasterTileInput } from '$routes/map/utils/formats/raster-tiles';
import { isS57File } from '$routes/map/utils/formats/s57/files';
import { getShapefileDataset } from '$routes/map/utils/formats/shp/files';
import { findLocalTilesetFiles } from '$routes/map/utils/formats/tiles3d';
import JSZip from 'jszip';

import type { DialogType } from '$routes/map/types';
import { isAsciiGridFile } from '$routes/map/utils/formats/ascii-grid/files';
import { isCityGmlFile } from '$routes/map/utils/formats/citygml/detector';
import { isCityJsonFile } from '$routes/map/utils/formats/cityjson/detector';
import { isRawRasterHeader, isRawRasterMain } from '$routes/map/utils/formats/envi-bil/files';
import { hasExifGps } from '$routes/map/utils/formats/exif';
import { isFileGdbRelatedFile } from '$routes/map/utils/formats/filegdb';
import { inspectGaussianSplatPlyFile } from '$routes/map/utils/formats/gaussian-splat';
import { hasGeoRssMarker } from '$routes/map/utils/formats/georss';
import { isGtfsZip } from '$routes/map/utils/formats/gtfs';
import { isHgtFile } from '$routes/map/utils/formats/hgt';
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
	CAD_MODEL_FILE_EXTENSIONS,
	findFirstByExtensions,
	findFirstSupportedFile,
	hasAnyExtension,
	hasExtension,
	hasKnownExtension,
	isGtfsTextSet,
	isShapeFileRelated,
	MODEL_FILE_EXTENSIONS,
	OPENDRIVE_FILE_EXTENSIONS,
	VTK_FILE_EXTENSIONS
} from './upload-drop-matchers';

export type UploadDropDecision =
	| { type: 'cancelled'; }
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
		sourceFiles: File[];
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
	resolve: (files: File[], options: UploadDropOptions) => Promise<UploadDropDecision>;
};

export type UploadDropOptions = {
	mobile?: boolean;
	checkExtractedFiles?: (files: File[]) => Promise<boolean>;
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
	const zip = await JSZip.loadAsync(await file.arrayBuffer());
	const extracted: File[] = [];
	const entries: [string, import('jszip').JSZipObject][] = [];

	zip.forEach((path, entry) => {
		if (!entry.dir) entries.push([path, entry]);
	});

	for (const [path, entry] of entries) {
		const blob = await entry.async('blob');
		const fileName = path.split('/').pop() ?? path;
		const extractedFile = new File([blob], fileName, { type: blob.type });
		Object.defineProperty(extractedFile, 'morivisRelativePath', {
			value: path,
			configurable: true
		});
		extracted.push(extractedFile);
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
		if (/<(?:[\w.-]+:)?OpenDRIVE(?:\s|>)/.test(header)) {
			return createDialogDecision('opendrive');
		}
		if (/<CADIF(?:\s|>)/.test(header)) return createDialogDecision('cedxm');

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
	geojsonl: 'geojson',
	jsonl: 'geojson',
	ndjson: 'geojson',
	geojsons: 'geojson',
	geojsonseq: 'geojson',
	mp4: 'video',
	webm: 'video',
	mov: 'video',
	m4v: 'video',
	ogv: 'video',
	bds: 'bds',
	gcd: 'gcd',
	csv: 'csv',
	tsv: 'tsv',
	xlsx: 'xlsx',
	pptx: 'pptx',
	docx: 'docx',
	wkt: 'wkt',
	ewkt: 'wkt',
	topojson: 'topojson',
	parquet: 'geoparquet',
	geoparquet: 'geoparquet',
	arrow: 'geoarrow',
	feather: 'geoarrow',
	tab: 'mapinfo-tab',
	jp2: 'jpeg2000',
	j2w: 'jpeg2000',
	jp2w: 'jpeg2000',
	map: 'mapinfo-tab',
	id: 'mapinfo-tab',
	ind: 'mapinfo-tab',
	mif: 'mif',
	mid: 'mif',
	gpx: 'gpx',
	tcx: 'tcx',
	fit: 'fit',
	osm: 'osm',
	gml: 'gml',
	landxml: 'landxml',
	xodr: 'opendrive',
	bz2: 'hrit',
	lrit: 'hrit',
	hrit: 'hrit',
	mt: 'drm',
	dm: 'dm',
	dwg: 'dwg',
	dxf: 'dxf',
	dgn: 'dgn',
	'000': 's57',
	jww: 'jww',
	jwc: 'jww',
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
	glb: 'model',
	gltf: 'model',
	vrm: 'model',
	'3ds': 'model',
	dae: 'model',
	'3dm': 'model',
	fbx: 'model',
	wrl: 'model',
	vrml: 'model',
	drc: 'model',
	'3mf': 'model',
	amf: 'model',
	stl: 'model',
	vtk: 'vtk',
	vtp: 'vtk',
	vtu: 'vtk',
	vti: 'vtk',
	vtr: 'vtk',
	vts: 'vtk',
	step: 'step-iges',
	stp: 'step-iges',
	iges: 'step-iges',
	igs: 'step-iges',
	ifc: 'model',
	pmx: 'model',
	usd: 'model',
	usda: 'model',
	usdz: 'model',
	h5: 'hdf5',
	tiff: 'geotiff',
	tif: 'geotiff',
	asc: 'ascii-grid',
	hgt: 'hgt',
	hdr: 'envi-bil',
	bil: 'envi-bil',
	bip: 'envi-bil',
	bsq: 'envi-bil',
	dat: 'envi-bil',
	img: 'envi-bil',
	raw: 'envi-bil',
	svg: 'svg',
	png: 'geopdf',
	webp: 'geopdf',
	pdf: 'geopdf',
	las: 'pointcloud',
	laz: 'pointcloud',
	ply: 'pointcloud',
	spz: 'gaussian-splat',
	rbxlx: 'roblox',
	rbxl: 'roblox',
	pcd: 'pointcloud',
	e57: 'pointcloud',
	xyz: 'pointcloud',
	mbtiles: 'mbtiles',
	nc: 'netcdf',
	nc4: 'netcdf',
	bin: 'grib2',
	grib2: 'grib2',
	grb2: 'grib2',
	grb: 'grib2',
	bcf: 'bcf'
};

const SXF_PRIMARY_EXTENSION = '.sfc';
const SXF_P21_EXTENSION = '.p21';
const SXF_SAF_EXTENSION = '.saf';

// 複数ファイルドロップ専用ルール。上から優先順に評価する。
const MULTI_FILE_RULES: UploadDropRule[] = [
	{
		id: 'dgn-file',
		match: files => files.some(file => hasExtension(file, '.dgn')),
		resolve: async files =>
			files.length === 1
				? createDialogDecision('dgn', files)
				: createNotificationDecision(
					'DGNは1ファイルずつ読み込んでください。参照図面の結合は未対応です'
				)
	},
	{
		id: 'jpeg2000-set',
		match: files => files.some(isJp2File),
		resolve: async files => createDialogDecision('jpeg2000', files)
	},
	{
		id: 'mapinfo-tab-set',
		match: files => files.some(isMapInfoTab),
		resolve: async files => createDialogDecision('mapinfo-tab', files)
	},
	{
		id: 'envi-bil-set',
		match: files => files.some(file => isRawRasterHeader(file) || isRawRasterMain(file)),
		resolve: async files => createDialogDecision('envi-bil', files)
	},
	{
		id: 'hgt-set',
		match: files => files.some(isHgtFile),
		resolve: async files => createDialogDecision('hgt', files.filter(isHgtFile))
	},
	{
		id: 'ascii-grid-set',
		match: files => files.some(isAsciiGridFile),
		resolve: async files =>
			createDialogDecision(
				'ascii-grid',
				files.filter(file => isAsciiGridFile(file) || hasExtension(file, '.prj'))
			)
	},
	{
		id: 'dm-set',
		match: files => files.some(file => hasAnyExtension(file, ['.dm', '.dmi'])),
		resolve: async files =>
			files.some(file => hasExtension(file, '.dm'))
				? createDialogDecision(
					'dm',
					files.filter(file => hasAnyExtension(file, ['.dm', '.dmi']))
				)
				: createNotificationDecision(
					'DMIは座標系の補助ファイルです。DMファイルと一緒に選択してください'
				)
	},
	{
		id: 'bds-set',
		match: files => files.some(file => hasExtension(file, '.bds')),
		resolve: async files =>
			files.every(file => hasExtension(file, '.bds'))
				? createDialogDecision('bds', files)
				: createNotificationDecision('BDSは.bdsファイルだけをまとめて選択してください')
	},
	{
		id: 'gcd-set',
		match: files => files.some(file => hasExtension(file, '.gcd')),
		resolve: async files =>
			files.every(file => hasExtension(file, '.gcd'))
				? createDialogDecision('gcd', files)
				: createNotificationDecision('GCDは.gcdファイルだけをまとめて選択してください')
	},
	{
		id: 'rik-archive',
		match: (files) => files.some((file) => hasExtension(file, '.rik')),
		resolve: async (files, options) => {
			const archives = files.filter((file) => hasExtension(file, '.rik'));
			if (archives.length !== 1) {
				return createNotificationDecision('RIKファイルは1つずつ読み込んでください');
			}
			return resolveSingleFile(archives[0], options);
		}
	},
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
					sourceFiles: files,
					placement: kmlModel.placement
				};
			}

			if (kmlModel && kmlModel.modelFiles.length > 0) {
				return createDialogDecision('model', kmlModel.modelFiles);
			}

			return createDialogDecision('kml');
		}
	},
	{
		id: 'step-iges-files',
		match: files => files.some(file => hasAnyExtension(file, CAD_MODEL_FILE_EXTENSIONS)),
		resolve: async files =>
			createDialogDecision(
				'step-iges',
				files.filter(file => hasAnyExtension(file, CAD_MODEL_FILE_EXTENSIONS))
			)
	},
	{
		id: 'opendrive-files',
		match: files => files.some(file => hasAnyExtension(file, OPENDRIVE_FILE_EXTENSIONS)),
		resolve: async files =>
			createDialogDecision(
				'opendrive',
				files.filter(file => hasAnyExtension(file, OPENDRIVE_FILE_EXTENSIONS))
			)
	},
	{
		id: 'vtk-files',
		match: files => files.some(file => hasAnyExtension(file, VTK_FILE_EXTENSIONS)),
		resolve: async files =>
			createDialogDecision(
				'vtk',
				files.filter(file => hasAnyExtension(file, VTK_FILE_EXTENSIONS))
			)
	},
	{
		id: 'model-files',
		match: (files) => !!findFirstByExtensions(files, MODEL_FILE_EXTENSIONS),
		resolve: async (files) => {
			const objFile = files.find((file) => hasExtension(file, '.obj'));
			if (!objFile) return createDialogDecision('model', files);

			const inspection = await inspectObjFile(objFile);
			attachProjectedModelEpsg(objFile, inspection.projectedModelEpsg);
			return createDialogDecision(inspection.isPointCloud ? 'pointcloud' : 'model', files);
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
		resolve: async (files, options) => {
			const firstFile = files[0];
			if (!firstFile) return createNotificationDecision('対応していないファイル形式です');
			if (await hasExifGps(firstFile)) {
				return createDialogDecision('geophoto');
			}
			return await resolveDroppedFiles(firstFile, options);
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

			return createDialogDecision('sxf');
		}
	},
	{
		id: 'shapefile-set',
		match: (files) => files.some(isShapeFileRelated),
		resolve: async files => {
			try {
				return createDialogDecision('shp', getShapefileDataset(files).files);
			} catch (error) {
				return createNotificationDecision((error as Error).message);
			}
		}
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
		resolve: async (files, options) => {
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
				return await resolveDroppedFiles(supportedFile, options);
			}

			return createNotificationDecision('対応していないファイル形式です');
		}
	}
];

// 単体ドロップ用の本体。特殊判定だけ if に残し、それ以外は拡張子表へ落とす。
const resolveSingleFile = async (
	file: File,
	options: UploadDropOptions
): Promise<UploadDropDecision> => {
	const ext = file.name.split('.').pop()?.toLowerCase();
	if (ext === 'dmi') {
		return createNotificationDecision(
			'DMIは座標系の補助ファイルです。DMファイルと一緒に選択してください'
		);
	}

	if (ext === 'rik') {
		try {
			const { extractRikModelFiles } = await import('$routes/map/utils/formats/rik/analyze');
			return createDialogDecision('model', await extractRikModelFiles(file));
		} catch (error) {
			return createNotificationDecision(
				error instanceof Error ? error.message : 'RIKファイルを読み込めませんでした'
			);
		}
	}

	if (ext === 'zip') {
		if (await isGeoZarrZip(file)) return createDialogDecision('geozarr', [file]);
		if (await isGtfsZip(file)) {
			return createDialogDecision('gtfs');
		}

		try {
			const extracted = await unzipFiles(file);
			if (extracted.length > 0) {
				if (
					options.checkExtractedFiles && !(await options.checkExtractedFiles(extracted))
				) {
					return { type: 'cancelled' };
				}
				return await resolveDroppedFiles(extracted, options);
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
				sourceFiles: [file],
				placement: kmlModel.placement
			};
		}
		return createDialogDecision('kml');
	}

	if (ext === 'kmz') {
		const kmzModel = await extractModelFromKmz(file).catch(() => null);
		if (kmzModel && kmzModel.modelFiles.length > 0) {
			return createDialogDecision('model', kmzModel.modelFiles);
		}
		return createDialogDecision('kml');
	}

	if (ext === 'obj') {
		const inspection = await inspectObjFile(file);
		attachProjectedModelEpsg(file, inspection.projectedModelEpsg);
		return createDialogDecision(inspection.isPointCloud ? 'pointcloud' : 'model');
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

	if (ext === 'ply') {
		const inspection = await inspectGaussianSplatPlyFile(file);
		if (inspection.kind === 'gaussian-splat') {
			return createDialogDecision('gaussian-splat');
		}
		if (inspection.kind === 'super-splat') {
			return createNotificationDecision(
				'SuperSplat 圧縮 PLY は未対応です。通常 PLY に書き出してから読み込んでください。'
			);
		}
	}

	if (ext === 'p21') {
		return createDialogDecision('sxf');
	}

	if (ext === 'saf') {
		return createDialogDecision('sxf');
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

	if (ext === 'vmd' || ext === 'vpd') {
		return createNotificationDecision('PMXファイル(.pmx)と一緒にドロップしてください');
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
const resolveMultipleFiles = async (
	files: File[],
	options: UploadDropOptions
): Promise<UploadDropDecision> => {
	for (const rule of MULTI_FILE_RULES) {
		if (!rule.match(files)) continue;
		return await rule.resolve(files, options);
	}

	return createNotificationDecision('対応していないファイル形式です');
};

// FileManager から呼ぶ公開入口。単体と複数の分岐だけをここで吸収する。
export const resolveDroppedFiles = async (
	input: File | File[],
	options: UploadDropOptions = {}
): Promise<UploadDropDecision> => {
	const files = Array.isArray(input) ? input : [input];
	// 更新単独でもフォームで基本セル不足を説明し、同じ入力欄から一式を選び直せる。
	if (files.some(isS57File)) return createDialogDecision('s57', files.filter(isS57File));
	if (isLocalGeoZarrFolder(files)) return createDialogDecision('geozarr', files);
	// MCAは同じワールドのリージョン一式を専用フォームへ渡す。
	if (files.some((file) => hasExtension(file, '.mca'))) {
		return files.every(file => hasExtension(file, '.mca'))
			? createDialogDecision('mca', files)
			: createNotificationDecision(
				'Minecraftの地形リージョン（.mca）だけをまとめて選択してください'
			);
	}
	// tilesetとGLB等が同居しても、個別モデルではなくフォルダ全体を渡す。
	if ((await findLocalTilesetFiles(files)).length) {
		return createDialogDecision('local-3dtiles', files);
	}
	if (await isLocalRasterTileInput(files)) {
		return createDialogDecision('local-raster-tiles', files);
	}
	if (files.some(isMltFile)) return createDialogDecision('local-mlt', files);
	// OSM PBFとMVTは拡張子が重なるため、タイル判定の前にBlobHeaderを確認する。
	const pbfFiles = files.filter(file => /\.pbf$/i.test(file.name));
	const osmPbfMatches = await Promise.all(pbfFiles.map(isOsmPbfFile));
	if (osmPbfMatches.some(Boolean)) {
		if (pbfFiles.length !== 1) {
			return createNotificationDecision('OSM PBFは1ファイルずつ読み込んでください');
		}
		return createDialogDecision('osm', pbfFiles);
	}
	if (isLocalMvtInput(files)) return createDialogDecision('local-mvt', files);
	const cityJsonCandidates = files.filter(file => /\.(?:json|cityjson)$/i.test(file.name));
	if (cityJsonCandidates.length) {
		const matches = await Promise.all(
			cityJsonCandidates.map(async file => ({ file, matched: await isCityJsonFile(file) }))
		);
		const cityJsonFiles = matches.filter(item => item.matched).map(item => item.file);
		if (cityJsonFiles.length) return createDialogDecision('cityjson', cityJsonFiles);
	}
	// .xml保存のOpenDRIVEも、.xodrとの混在やZIP展開後に同じ一式へまとめる。
	const openDriveXml = files.filter(file => /\.xml$/i.test(file.name));
	if (openDriveXml.length) {
		const matches = await Promise.all(
			openDriveXml.map(async file => ({
				file,
				matched: /<(?:[\w.-]+:)?OpenDRIVE(?:\s|>)/.test(await file.slice(0, 2000).text())
			}))
		);
		const xmlFiles = new Set(matches.filter(item => item.matched).map(item => item.file));
		if (xmlFiles.size) {
			return createDialogDecision(
				'opendrive',
				files.filter(file =>
					hasAnyExtension(file, OPENDRIVE_FILE_EXTENSIONS) || xmlFiles.has(file)
				)
			);
		}
	}
	// 汎用GML・XMLより先にCityGMLを判定する。ZIP展開後も同じ入口を通す。
	const cityGmlCandidates = files.filter((file) => /\.(?:gml|xml|citygml)$/i.test(file.name));
	if (cityGmlCandidates.length) {
		try {
			const matches = await Promise.all(cityGmlCandidates.map(async (file) => ({
				file,
				matched: /\.citygml$/i.test(file.name) || await isCityGmlFile(file)
			})));
			const cityGmlFiles = matches.filter(({ matched }) => matched).map(({ file }) => file);
			if (cityGmlFiles.length) return createDialogDecision('citygml', cityGmlFiles);
		} catch {
			return createNotificationDecision('CityGML / XMLファイルを読み取れませんでした');
		}
	}
	// モバイルの写真はGPSの有無にかかわらず写真フォームへ渡す。
	// ワールドファイル付き画像やモデルのテクスチャは従来の組み合わせ判定を優先する。
	if (
		options.mobile && files.length > 0
		&& files.every((file) => /\.(jpe?g|heic|heif|png|webp)$/i.test(file.name))
	) {
		return createDialogDecision('geophoto', files);
	}
	if (Array.isArray(input)) {
		if (input.length === 0) {
			return createNotificationDecision('対応していないファイル形式です');
		}
		return await resolveMultipleFiles(input, options);
	}

	return await resolveSingleFile(input, options);
};
