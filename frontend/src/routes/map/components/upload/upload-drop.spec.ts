import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$routes/map/utils/formats/exif', () => ({
	hasExifGps: vi.fn()
}));

vi.mock('$routes/map/utils/formats/gtfs', () => ({
	isGtfsZip: vi.fn()
}));

vi.mock('$routes/map/utils/formats/hrit', () => ({
	isLikelyHritFile: vi.fn()
}));

vi.mock('$routes/map/utils/formats/kml', () => ({
	extractModelFromKml: vi.fn(),
	extractModelFromKmz: vi.fn()
}));

vi.mock('$routes/map/utils/formats/location-history', () => ({
	isLocationHistoryFile: vi.fn()
}));

vi.mock('$routes/map/utils/formats/mf-json', () => ({
	isMfJsonFile: vi.fn()
}));

vi.mock('$routes/map/utils/formats/obj', () => ({
	inspectObjFile: vi.fn()
}));

vi.mock('$routes/map/utils/formats/raster/sidecar', () => ({
	findGeoReferencedImageFile: vi.fn(),
	findRasterImageFile: vi.fn(),
	isRasterImageMainFile: vi.fn(),
	isRasterImageSidecarFile: vi.fn()
}));

vi.mock('$routes/map/utils/formats/xyz', () => ({
	isPointCloudTextFile: vi.fn()
}));

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
import { resolveDroppedFiles } from './upload-drop';

const createFile = (name: string, content = 'test', type = 'text/plain') =>
	new File([content], name, { type });

describe('resolveDroppedFiles', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(hasExifGps).mockResolvedValue(false);
		vi.mocked(isGtfsZip).mockResolvedValue(false);
		vi.mocked(isLikelyHritFile).mockResolvedValue(false);
		vi.mocked(extractModelFromKml).mockResolvedValue(null);
		vi.mocked(extractModelFromKmz).mockResolvedValue(null);
		vi.mocked(isLocationHistoryFile).mockResolvedValue(false);
		vi.mocked(isMfJsonFile).mockResolvedValue(false);
		vi.mocked(inspectObjFile).mockResolvedValue({
			isPointCloud: false,
			hasFaces: true,
			vertexCount: 10
		});
		vi.mocked(findGeoReferencedImageFile).mockReturnValue(null);
		vi.mocked(findRasterImageFile).mockReturnValue(null);
		vi.mocked(isRasterImageMainFile).mockReturnValue(false);
		vi.mocked(isRasterImageSidecarFile).mockReturnValue(false);
		vi.mocked(isPointCloudTextFile).mockResolvedValue(false);
	});

	it('単一の CSV は csv ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('sample.csv'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'csv',
			dropFiles: undefined
		});
	});

	it('単一の XLSX は xlsx ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(
			createFile(
				'sample.xlsx',
				'xlsx',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			)
		);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'xlsx',
			dropFiles: undefined
		});
	});

	it('単一の SVG は svg ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(
			createFile('plan.svg', '<svg></svg>', 'image/svg+xml')
		);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'svg',
			dropFiles: undefined
		});
	});

	it('Location History JSON は locationhistory 判定になる', async () => {
		vi.mocked(isLocationHistoryFile).mockResolvedValue(true);

		const result = await resolveDroppedFiles(
			createFile('history.json', '{}', 'application/json')
		);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'locationhistory',
			dropFiles: undefined
		});
	});

	it('MF-JSON は mfjson 判定になる', async () => {
		vi.mocked(isMfJsonFile).mockResolvedValue(true);

		const result = await resolveDroppedFiles(
			createFile('track.geojson', '{}', 'application/json')
		);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'mfjson',
			dropFiles: undefined
		});
	});

	it('KMZ からモデル群が抽出できると glb ダイアログへ進む', async () => {
		const modelFiles = [createFile('building.glb', 'glb', 'model/gltf-binary')];
		vi.mocked(extractModelFromKmz).mockResolvedValue({
			modelFiles,
			mainModelPath: 'building.glb'
		});

		const result = await resolveDroppedFiles(createFile('scene.kmz', 'kmz', 'application/zip'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'glb',
			dropFiles: modelFiles
		});
	});

	it('GTFS ZIP は展開せず gtfs 判定になる', async () => {
		vi.mocked(isGtfsZip).mockResolvedValue(true);

		const result = await resolveDroppedFiles(createFile('feed.zip', 'zip', 'application/zip'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'gtfs',
			dropFiles: undefined
		});
	});

	it('EXIF 付き写真一式は geophoto 判定になる', async () => {
		vi.mocked(hasExifGps).mockResolvedValue(true);

		const result = await resolveDroppedFiles([
			createFile('a.jpg', 'a', 'image/jpeg'),
			createFile('b.heic', 'b', 'image/heic')
		]);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'geophoto',
			dropFiles: undefined
		});
	});

	it('OBJ が点群なら pointcloud 判定になる', async () => {
		vi.mocked(inspectObjFile).mockResolvedValue({
			isPointCloud: true,
			hasFaces: false,
			vertexCount: 100
		});

		const result = await resolveDroppedFiles(createFile('points.obj'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'pointcloud',
			dropFiles: undefined
		});
	});

	it('TXT が点群テキストなら pointcloud 判定になる', async () => {
		vi.mocked(isPointCloudTextFile).mockResolvedValue(true);

		const result = await resolveDroppedFiles(createFile('points.txt'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'pointcloud',
			dropFiles: undefined
		});
	});

	it('TXT が点群でなければエラー通知になる', async () => {
		const result = await resolveDroppedFiles(createFile('memo.txt'));

		expect(result).toEqual({
			type: 'notification',
			level: 'error',
			message: '対応していないTXTファイルです'
		});
	});

	it('Shapefile 関連ファイルを含む複数ドロップは shp 判定になる', async () => {
		const result = await resolveDroppedFiles([
			createFile('roads.shp'),
			createFile('roads.dbf'),
			createFile('roads.shx')
		]);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'shp',
			dropFiles: undefined
		});
	});

	it('補助ファイルだけのドロップはエラー通知になる', async () => {
		vi.mocked(isRasterImageSidecarFile).mockImplementation((file) =>
			file.name.endsWith('.tfw')
		);

		const result = await resolveDroppedFiles([createFile('ortho.tfw')]);

		expect(result).toEqual({
			type: 'notification',
			level: 'error',
			message: '画像ファイル(.tif/.png/.jpg)と一緒にドロップしてください'
		});
	});

	it('画像本体と sidecar の名前が一致しないと組み合わせ不一致エラーになる', async () => {
		vi.mocked(isRasterImageSidecarFile).mockImplementation((file) =>
			file.name.endsWith('.tfw')
		);
		vi.mocked(isRasterImageMainFile).mockImplementation((file) => file.name.endsWith('.tif'));

		const result = await resolveDroppedFiles([
			createFile('ortho.tfw'),
			createFile('other.tif', 'tif', 'image/tiff')
		]);

		expect(result).toEqual({
			type: 'notification',
			level: 'error',
			message:
				'画像ファイルと補助ファイルの組み合わせが一致しません。同じ名前の .tfw または .aux.xml を一緒にドロップしてください'
		});
	});

	it('複数 XML は先頭内容から demxml 判定できる', async () => {
		const result = await resolveDroppedFiles([
			createFile('a.xml', '<Dataset><DEM></DEM></Dataset>', 'application/xml'),
			createFile('b.xml', '<Dataset><DEM></DEM></Dataset>', 'application/xml')
		]);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'demxml',
			dropFiles: undefined
		});
	});

	it('複数 KML でローカルモデル群が解決できると glb 判定になる', async () => {
		const modelFiles = [createFile('building.glb', 'glb', 'model/gltf-binary')];
		vi.mocked(extractModelFromKml).mockResolvedValue({
			modelFiles
		});

		const result = await resolveDroppedFiles([
			createFile('scene.kml', '<kml></kml>', 'application/vnd.google-earth.kml+xml'),
			createFile('building.glb', 'glb', 'model/gltf-binary')
		]);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'glb',
			dropFiles: modelFiles
		});
	});

	it('拡張子なし HRIT 単体ファイルは hrit 判定になる', async () => {
		vi.mocked(isLikelyHritFile).mockResolvedValue(true);

		const result = await resolveDroppedFiles(createFile('IMG_DK01'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'hrit',
			dropFiles: undefined
		});
	});

	it('複数ドロップで拡張子なし HRIT を含むと hrit 判定になり files を保持する', async () => {
		vi.mocked(isLikelyHritFile).mockImplementation(async (file) => file.name === 'IMG_DK01');
		const files = [createFile('IMG_DK01'), createFile('IMG_DK02')];

		const result = await resolveDroppedFiles(files);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'hrit',
			dropFiles: files
		});
	});

	it('複数ドロップの最後は既知拡張子の代表ファイルを単体判定へ回す', async () => {
		const result = await resolveDroppedFiles([
			createFile('notes.unknown'),
			createFile('track.gpx', '<gpx></gpx>', 'application/gpx+xml')
		]);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'gpx',
			dropFiles: undefined
		});
	});

	it('KML からリモートモデル参照が見つかると専用判定を返す', async () => {
		vi.mocked(extractModelFromKml).mockResolvedValue({
			modelUrl: 'https://example.com/model.glb',
			modelFiles: [],
			placement: {
				name: 'Remote Model',
				lng: 136.9,
				lat: 35.5,
				altitude: 10
			}
		});

		const result = await resolveDroppedFiles([
			createFile('model.kml', '<kml></kml>', 'application/vnd.google-earth.kml+xml')
		]);

		expect(result).toEqual({
			type: 'remote-kml-model',
			name: 'Remote Model',
			modelUrl: 'https://example.com/model.glb',
			placement: {
				name: 'Remote Model',
				lng: 136.9,
				lat: 35.5,
				altitude: 10
			}
		});
	});
});
