import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Jw_cadのドロップ', () => {
	it.each(['test-drawing.jww', 'test-drawing.JWW', 'test-drawing.jwc', 'test-drawing.JWC'])(
		'Jw_cadを専用フォームへ渡す: %s',
		async name => {
			const file = new File(['test'], name);
			expect(await resolveDroppedFiles(file)).toEqual({
				type: 'dialog',
				dialogType: 'jww',
				dropFiles: undefined
			});
		}
	);
});

describe('CEDXMのドロップ', () => {
	it.each([false, true])('XML本体とフォルダ入力を判定する: folder=%s', async folder => {
		const file = new File([
			'<?xml version="1.0" encoding="Shift_JIS"?><CADIF Version="1.0"></CADIF>'
		], 'test-building.xml');
		Object.defineProperty(file, 'morivisRelativePath', {
			value: 'test-building/test-building.xml'
		});
		expect(await resolveDroppedFiles(folder ? [file] : file)).toEqual({
			type: 'dialog',
			dialogType: 'cedxm',
			dropFiles: undefined
		});
	});
});

describe('ローカルMVTのドロップ', () => {
	it('TileJSONとタイル一式をフォームに渡す', async () => {
		const files = [new File(['{}'], 'tilejson.json'), new File(['test'], '1.mvt')];
		expect(await resolveDroppedFiles(files)).toEqual({
			type: 'dialog',
			dialogType: 'local-mvt',
			dropFiles: files
		});
	});
	it('単体MVTとTileJSONにも専用フォームで入力方法を案内する', async () => {
		for (const name of ['1.mvt', '1.pbf', 'tilejson.json']) {
			const file = new File(['test'], name);
			expect(await resolveDroppedFiles(file)).toEqual({
				type: 'dialog',
				dialogType: 'local-mvt',
				dropFiles: [file]
			});
		}
	});
	it('ZIPを展開してタイルの相対パスを保持する', async () => {
		const zip = new JSZip();
		zip.file('test-set/tilejson.json', '{}');
		zip.file('test-set/2/1/1.mvt', 'test');
		const file = new File([await zip.generateAsync({ type: 'arraybuffer' })], 'test-set.zip');
		const result = await resolveDroppedFiles(file);
		expect(result.type).toBe('dialog');
		if (result.type !== 'dialog') throw new Error('test dialog required');
		expect(result.dialogType).toBe('local-mvt');
		expect(
			result.dropFiles?.map(item =>
				(item as File & { morivisRelativePath: string; }).morivisRelativePath
			)
		).toEqual(['test-set/tilejson.json', 'test-set/2/1/1.mvt']);
	});
});

describe('ローカルラスタータイルのドロップ', () => {
	const tileFile = () => {
		const file = new File(['test-image'], '1.png');
		Object.defineProperty(file, 'morivisRelativePath', { value: 'test-set/2/1/1.png' });
		return file;
	};
	it('TileJSON付き画像フォルダはMVTより先に判定する', async () => {
		const files = [new File(['{}'], 'tilejson.json'), tileFile()];
		expect(await resolveDroppedFiles(files)).toEqual({
			type: 'dialog',
			dialogType: 'local-raster-tiles',
			dropFiles: files
		});
	});
	it('モバイルでも画像タイルを写真フォームへ渡さない', async () => {
		const files = [tileFile()];
		expect(await resolveDroppedFiles(files, { mobile: true })).toEqual({
			type: 'dialog',
			dialogType: 'local-raster-tiles',
			dropFiles: files
		});
	});
	it('画像のTileJSON単体はラスター用フォームで再入力を案内する', async () => {
		const file = new File([JSON.stringify({ tiles: ['/{z}/{x}/{y}.webp'] })], 'tilejson.json');
		expect(await resolveDroppedFiles(file)).toEqual({
			type: 'dialog',
			dialogType: 'local-raster-tiles',
			dropFiles: [file]
		});
	});
	it('ZIP展開後も画像タイルの階層を保持する', async () => {
		const zip = new JSZip();
		zip.file('test-set/2/1/1.png', 'test-image');
		const file = new File(
			[await zip.generateAsync({ type: 'arraybuffer' })],
			'test-raster.zip'
		);
		const result = await resolveDroppedFiles(file);
		expect(result.type).toBe('dialog');
		if (result.type !== 'dialog') throw new Error('test dialog required');
		expect(result.dialogType).toBe('local-raster-tiles');
		expect(
			(result.dropFiles?.[0] as File & { morivisRelativePath: string; }).morivisRelativePath
		).toBe('test-set/2/1/1.png');
	});
});

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

const createPathLikeFile = (name: string, relativePath: string, content = 'test') => {
	const file = createFile(name, content);
	Object.defineProperty(file, 'morivisRelativePath', {
		value: relativePath,
		configurable: true
	});
	return file;
};

describe('resolveDroppedFiles', () => {
	it('タイルセットとGLBを含むフォルダは3D Tilesフォームに渡す', async () => {
		const files = [
			createPathLikeFile(
				'tileset.json',
				'test-set/tileset.json',
				JSON.stringify({ asset: { version: '1.0' }, root: {} })
			),
			createPathLikeFile('test.glb', 'test-set/data/test.glb')
		];
		expect(await resolveDroppedFiles(files)).toEqual({
			type: 'dialog',
			dialogType: 'local-3dtiles',
			dropFiles: files
		});
	});

	it('tiles.json単体も内容で3D Tilesと判定する', async () => {
		const file = createFile(
			'tiles.json',
			JSON.stringify({ asset: { version: '1.1' }, root: {} })
		);
		expect(await resolveDroppedFiles(file)).toEqual({
			type: 'dialog',
			dialogType: 'local-3dtiles',
			dropFiles: [file]
		});
	});
	const cityGml = readFileSync(
		new URL('../../utils/formats/citygml/__fixtures__/test-buildings.gml', import.meta.url),
		'utf8'
	);

	it.each(['gml', 'xml', 'citygml'])('CityGMLの.%sは専用フォームに渡す', async (extension) => {
		const file = createFile(`test-building.${extension}`, cityGml);
		expect(await resolveDroppedFiles(file)).toEqual({
			type: 'dialog',
			dialogType: 'citygml',
			dropFiles: [file]
		});
	});

	it('複数のCityGMLと補助ファイルからCityGML一式をフォームに渡す', async () => {
		const files = [createFile('test-a.gml', cityGml), createFile('test-b.xml', cityGml)];
		expect(await resolveDroppedFiles([...files, createFile('test-texture.png')])).toEqual({
			type: 'dialog',
			dialogType: 'citygml',
			dropFiles: files
		});
	});

	it('通常GMLをCityGMLフォームに渡さない', async () => {
		expect(
			await resolveDroppedFiles(
				createFile(
					'test-generic.gml',
					'<g:FeatureCollection xmlns:g="http://www.opengis.net/gml"/>'
				)
			)
		)
			.toMatchObject({ type: 'dialog', dialogType: 'gml' });
	});

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
			vertexCount: 10,
			projectedModelEpsg: null,
			referencedMaterialLibraries: []
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

	it.each(['jpg', 'jpeg', 'heic', 'heif', 'png', 'webp'])(
		'モバイルの %s は位置情報の有無を写真フォームで確認する',
		async (extension) => {
			const file = createFile(`test-photo.${extension}`);
			expect(await resolveDroppedFiles(file, { mobile: true })).toEqual({
				type: 'dialog',
				dialogType: 'geophoto',
				dropFiles: [file]
			});
		}
	);

	it('モバイルでは写真一式を先頭のGPSの有無で切り捨てない', async () => {
		const files = [createFile('test-no-gps.jpg'), createFile('test-with-gps.heic')];
		expect(await resolveDroppedFiles(files, { mobile: true })).toEqual({
			type: 'dialog',
			dialogType: 'geophoto',
			dropFiles: files
		});
	});

	it('PCのGPSなし画像は従来の位置合わせへ進む', async () => {
		expect(await resolveDroppedFiles(createFile('test-no-gps.jpg'))).toMatchObject({
			type: 'dialog',
			dialogType: 'geopdf'
		});
	});

	it('単一の BCF は bcf ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('test-issues.bcf', 'bcf'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'bcf',
			dropFiles: undefined
		});
	});

	it('単一の PMX はモデルダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('test-model.pmx', 'pmx'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'model',
			dropFiles: undefined
		});
	});

	it('単一の VRM はモデルダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('test-avatar.vrm', 'vrm'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'model',
			dropFiles: undefined
		});
	});

	it('単一の STL はモデルダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('test-shape.stl', 'solid test-shape'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'model',
			dropFiles: undefined
		});
	});

	it.each(['model.usd', 'model.usda', 'model.usdz'])(
		'%s はモデルダイアログ判定になる',
		async (fileName) => {
			const result = await resolveDroppedFiles(createFile(fileName, 'usd'));

			expect(result).toEqual({
				type: 'dialog',
				dialogType: 'model',
				dropFiles: undefined
			});
		}
	);

	it('VRM と VRMA を同時にドロップするとモデルダイアログでまとめて扱う', async () => {
		const vrmFile = createFile('test-avatar.vrm', 'vrm');
		const vrmaFile = createFile('test-motion.vrma', 'vrma');

		const result = await resolveDroppedFiles([vrmFile, vrmaFile]);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'model',
			dropFiles: [vrmFile, vrmaFile]
		});
	});

	it('通常の3D Gaussian Splatting PLYは専用ダイアログ判定になる', async () => {
		const header = [
			'ply',
			'format binary_little_endian 1.0',
			'element vertex 1',
			'property float x',
			'property float y',
			'property float z',
			'property float f_dc_0',
			'property float f_dc_1',
			'property float f_dc_2',
			'property float opacity',
			'property float scale_0',
			'property float scale_1',
			'property float scale_2',
			'property float rot_0',
			'property float rot_1',
			'property float rot_2',
			'property float rot_3',
			'end_header',
			''
		].join('\n');

		const result = await resolveDroppedFiles(createFile('synthetic-splats.ply', header));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'gaussian-splat',
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

	it('単一の SQLite は sqlite ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('sample.sqlite'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'sqlite',
			dropFiles: undefined
		});
	});

	it('単一の SQL dump は sqlite ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('sample.sql'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'sqlite',
			dropFiles: undefined
		});
	});

	it('単一の DWG は dwg ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('plan.dwg', 'dwg'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'dwg',
			dropFiles: undefined
		});
	});

	it('単一の SFC は sxf ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('plan.sfc', 'sxf'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'sxf',
			dropFiles: undefined
		});
	});

	it('単一の P21 は sxf ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('plan.p21', 'sxf'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'sxf',
			dropFiles: undefined
		});
	});

	it('単一の SAF は sxf ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('plan.saf', 'saf'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'sxf',
			dropFiles: undefined
		});
	});

	it('単一の MT は drm ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('624011.mt', 'mt'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'drm',
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

	it('GeoRSS の XML は georss ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(
			createFile(
				'feed.xml',
				`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:georss="http://www.georss.org/georss" xmlns:gml="http://www.opengis.net/gml">
	<channel>
		<item>
			<title>place</title>
			<georss:where>
				<gml:Point><gml:pos>35.0 139.0</gml:pos></gml:Point>
			</georss:where>
		</item>
	</channel>
</rss>`
			)
		);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'georss',
			dropFiles: undefined
		});
	});

	it('GeoRSS の RSS は georss ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles(
			createFile(
				'feed.rss',
				`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:georss="http://www.georss.org/georss">
	<channel>
		<item>
			<title>place</title>
			<georss:point>35.0 139.0</georss:point>
		</item>
	</channel>
</rss>`
			)
		);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'georss',
			dropFiles: undefined
		});
	});

	it('GeoRSS でない RSS は未対応通知になる', async () => {
		const result = await resolveDroppedFiles(
			createFile(
				'plain.rss',
				`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
	<channel>
		<item><title>plain</title></item>
	</channel>
</rss>`
			)
		);

		expect(result).toEqual({
			type: 'notification',
			level: 'error',
			message: '対応していないXMLファイルです'
		});
	});

	it('DRMフォルダは標高CSVを除外して drm ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles([
			createPathLikeFile(
				'624011.mt',
				'drm3803A_EBCDIC_01北海道/3803Asono1_ho/624011.mt',
				'mt'
			),
			createPathLikeFile(
				'624011H.csv',
				'drm3803A標高CSV_01北海道/3803Asono1_ho/624011H.csv',
				'csv'
			)
		]);

		expect(result).toMatchObject({
			type: 'dialog',
			dialogType: 'drm'
		});
		expect(result.type).toBe('dialog');
		if (result.type !== 'dialog') return;
		expect(result.dropFiles).toBeUndefined();
	});

	it('SXF フォルダは TIF より SFC を優先して sxf ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles([
			createPathLikeFile('D0PL0011.TIF', 'D0PL001ZSFC/D0PL0011.TIF', 'image/tiff'),
			createPathLikeFile('D0PL001Z.SAF', 'D0PL001ZSFC/D0PL001Z.SAF', 'text/plain'),
			createPathLikeFile('D0PL001Z.SFC', 'D0PL001ZSFC/D0PL001Z.SFC', 'sxf')
		]);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'sxf',
			dropFiles: undefined
		});
	});

	it('SXF の P21 フォルダは sxf ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles([
			createPathLikeFile('D0PL0011.TIF', 'D0PL001ZP21/D0PL0011.TIF', 'image/tiff'),
			createPathLikeFile('D0PL001Z.SAF', 'D0PL001ZP21/D0PL001Z.SAF', 'text/plain'),
			createPathLikeFile('D0PL001Z.P21', 'D0PL001ZP21/D0PL001Z.P21', 'text/plain')
		]);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'sxf',
			dropFiles: undefined
		});
	});

	it('SXF の SAF だけでも sxf ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles([
			createPathLikeFile('D0PL0011.TIF', 'D0PL001ZSFC/D0PL0011.TIF', 'image/tiff'),
			createPathLikeFile('D0PL001Z.SAF', 'D0PL001ZSFC/D0PL001Z.SAF', 'text/plain')
		]);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'sxf',
			dropFiles: undefined
		});
	});

	it('FileGDB の構成ファイル一式は filegdb ダイアログ判定になる', async () => {
		const result = await resolveDroppedFiles([
			createPathLikeFile(
				'a00000001.gdbtable',
				'roads.gdb/a00000001.gdbtable',
				'catalog-table'
			),
			createPathLikeFile(
				'a00000001.gdbtablx',
				'roads.gdb/a00000001.gdbtablx',
				'catalog-index'
			),
			createPathLikeFile('a00000009.gdbtable', 'roads.gdb/a00000009.gdbtable', 'layer-table'),
			createPathLikeFile('a00000009.gdbtablx', 'roads.gdb/a00000009.gdbtablx', 'layer-index')
		]);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'filegdb',
			dropFiles: undefined
		});
	});

	it('単一の Garmin GDB は gdb ダイアログ判定のまま', async () => {
		const result = await resolveDroppedFiles(createFile('tracks.gdb'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'gdb',
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

	it('KMZ からモデル群が抽出できるとモデルダイアログへ進む', async () => {
		const modelFiles = [createFile('building.glb', 'glb', 'model/gltf-binary')];
		vi.mocked(extractModelFromKmz).mockResolvedValue({
			modelFiles,
			mainModelPath: 'building.glb'
		});

		const result = await resolveDroppedFiles(createFile('scene.kmz', 'kmz', 'application/zip'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'model',
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
			vertexCount: 100,
			projectedModelEpsg: null,
			referencedMaterialLibraries: []
		});

		const result = await resolveDroppedFiles(createFile('points.obj'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'pointcloud',
			dropFiles: undefined
		});
	});

	it('OBJ の projectedModelEpsg をドロップファイルに保持する', async () => {
		vi.mocked(inspectObjFile).mockResolvedValue({
			isPointCloud: false,
			hasFaces: true,
			vertexCount: 100,
			projectedModelEpsg: '6677',
			referencedMaterialLibraries: []
		});

		const file = createFile('projected.obj');
		const result = await resolveDroppedFiles(file);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'model',
			dropFiles: undefined
		});
		expect((file as File & { morivisProjectedModelEpsg?: string; }).morivisProjectedModelEpsg)
			.toBe(
				'6677'
			);
	});

	it('glTF 単体ドロップはモデル判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('scene.gltf'));

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'model',
			dropFiles: undefined
		});
	});

	it('glTF と補助ファイルを同時ドロップしたときはファイル群を保持したままモデル判定になる', async () => {
		const gltfFile = createFile('scene.gltf');
		const binFile = createFile('scene.bin');
		const textureFile = createFile('wall.png');

		const result = await resolveDroppedFiles([gltfFile, binFile, textureFile]);

		expect(result).toEqual({
			type: 'dialog',
			dialogType: 'model',
			dropFiles: [gltfFile, binFile, textureFile]
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

	it('COPC LAZ は pointcloud 判定になる', async () => {
		const result = await resolveDroppedFiles(createFile('forest.copc.laz', 'copc'));

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

	it('複数 KML でローカルモデル群が解決できるとモデル判定になる', async () => {
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
			dialogType: 'model',
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

		const files = [
			createFile('test-model.kml', '<kml></kml>', 'application/vnd.google-earth.kml+xml')
		];
		const result = await resolveDroppedFiles(files);

		expect(result).toEqual({
			type: 'remote-kml-model',
			name: 'Remote Model',
			modelUrl: 'https://example.com/model.glb',
			sourceFiles: files,
			placement: {
				name: 'Remote Model',
				lng: 136.9,
				lat: 35.5,
				altitude: 10
			}
		});
	});
});
