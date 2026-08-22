import { describe, expect, it, vi } from 'vitest';

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

vi.mock('$routes/map/utils/formats/raster/sidecar', async () => {
	const actual = await vi.importActual<
		typeof import('$routes/map/utils/formats/raster/sidecar')
	>('$routes/map/utils/formats/raster/sidecar');

	return {
		...actual,
		findGeoReferencedImageFile: vi.fn(actual.findGeoReferencedImageFile),
		findRasterImageFile: vi.fn(actual.findRasterImageFile),
		isRasterImageMainFile: vi.fn(actual.isRasterImageMainFile)
	};
});

vi.mock('$routes/map/utils/formats/xyz', () => ({
	isPointCloudTextFile: vi.fn()
}));

import { resolveOpenDialogDrop } from './dialog-drop-policy';

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

describe('resolveOpenDialogDrop', () => {
	it('SXFフォームで .saf を追加ドロップしたときは同一フォームにファイルをマージする', async () => {
		const currentFiles = [createFile('plan.sfc')];
		const incomingFiles = [createFile('plan.saf')];

		const result = await resolveOpenDialogDrop('sxf', currentFiles, incomingFiles);

		expect(result).toEqual({
			type: 'stay',
			dropFiles: expect.arrayContaining([currentFiles[0], incomingFiles[0]])
		});
	});

	it('GeoTIFFフォームでワールドファイルを追加ドロップしたときは同一フォームにファイルをマージする', async () => {
		const currentFiles = [createFile('photo.tif')];
		const incomingFiles = [createFile('photo.tfw')];

		const result = await resolveOpenDialogDrop('geotiff', currentFiles, incomingFiles);

		expect(result).toEqual({
			type: 'stay',
			dropFiles: expect.arrayContaining([currentFiles[0], incomingFiles[0]])
		});
	});

	it('OBJフォームで .mtl とテクスチャ画像を追加ドロップしたときは同一フォームにファイルをマージする', async () => {
		const currentFiles = [createFile('house.obj')];
		const incomingFiles = [createFile('house.mtl'), createFile('wall.webp')];

		const result = await resolveOpenDialogDrop('glb', currentFiles, incomingFiles);

		expect(result).toEqual({
			type: 'stay',
			dropFiles: expect.arrayContaining([currentFiles[0], ...incomingFiles])
		});
	});

	it('glTFフォームで参照中の補助ファイルを追加ドロップしたときは同一フォームにファイルをマージする', async () => {
		const currentFiles = [
			createFile(
				'scene.gltf',
				JSON.stringify({
					asset: { version: '2.0' },
					buffers: [{ uri: 'buffers/scene.buffer' }],
					images: [{ uri: 'textures/wall.png' }]
				})
			)
		];
		const incomingFiles = [
			createPathLikeFile('scene.buffer', 'buffers/scene.buffer'),
			createPathLikeFile('wall.png', 'textures/wall.png')
		];

		const result = await resolveOpenDialogDrop('glb', currentFiles, incomingFiles);

		expect(result).toEqual({
			type: 'stay',
			dropFiles: expect.arrayContaining([currentFiles[0], ...incomingFiles])
		});
	});

	it('FileGDBフォームで関連ファイルを追加ドロップしたときは同一フォームにファイルをマージする', async () => {
		const currentFiles = [createPathLikeFile('a00000009.gdbtable', 'sample.gdb/a00000009.gdbtable')];
		const incomingFiles = [createPathLikeFile('a00000009.gdbtablx', 'sample.gdb/a00000009.gdbtablx')];

		const result = await resolveOpenDialogDrop('filegdb', currentFiles, incomingFiles);

		expect(result).toEqual({
			type: 'stay',
			dropFiles: expect.arrayContaining([currentFiles[0], incomingFiles[0]])
		});
	});

	it('現在のフォームと無関係なファイルは既存判定に委譲して別フォームへ切り替える', async () => {
		const result = await resolveOpenDialogDrop('sxf', [createFile('plan.sfc')], [createFile('data.csv')]);

		expect(result).toEqual({
			type: 'delegate',
			decision: {
				type: 'dialog',
				dialogType: 'csv',
				dropFiles: undefined
			}
		});
	});

	it('同じ形式の新しい主ファイルを落としたときは現在ファイルを置き換える', async () => {
		const currentFiles = [createFile('old.tif')];
		const incomingFiles = [createFile('new.tif')];

		const result = await resolveOpenDialogDrop('geotiff', currentFiles, incomingFiles);

		expect(result).toEqual({
			type: 'stay',
			dropFiles: incomingFiles
		});
	});
});
