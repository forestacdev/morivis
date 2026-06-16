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
		vi.mocked(inspectObjFile).mockResolvedValue({ isPointCloud: false });
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

	it('KMZ からモデル群が抽出できると glb ダイアログへ進む', async () => {
		const modelFiles = [createFile('building.glb', 'glb', 'model/gltf-binary')];
		vi.mocked(extractModelFromKmz).mockResolvedValue({
			modelFiles
		});

		const result = await resolveDroppedFiles(createFile('scene.kmz', 'kmz', 'application/zip'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'glb',
			dropFiles: modelFiles
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
