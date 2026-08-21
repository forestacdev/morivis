import { describe, expect, it } from 'vitest';

import {
	findGeoReferencedImageFile,
	findMatchingAuxXmlFile,
	findMatchingWorldFile,
	findRasterImageFile,
	getRasterPathLikeName,
	hasMatchingRasterSidecar,
	isRasterImageMainFile,
	isRasterImageSidecarFile
} from './sidecar';

const createFile = (name: string, relativePath?: string) => {
	const file = new File(['test'], name);

	if (relativePath) {
		Object.defineProperty(file, 'morivisRelativePath', {
			value: relativePath,
			configurable: true
		});
	}

	return file;
};

describe('raster sidecar helpers', () => {
	it('相対パスを優先してラスタ画像を判定する', () => {
		const imageFile = createFile('ORTHO.TIF', 'tiles/ORTHO.TIF');

		expect(getRasterPathLikeName(imageFile)).toBe('tiles/ortho.tif');
		expect(isRasterImageMainFile(imageFile)).toBe(true);
		expect(findRasterImageFile([imageFile])).toBe(imageFile);
	});

	it('world file と aux.xml を sidecar として判定する', () => {
		expect(isRasterImageSidecarFile(createFile('sample.tfw'))).toBe(true);
		expect(isRasterImageSidecarFile(createFile('sample.tif.aux.xml'))).toBe(true);
		expect(isRasterImageSidecarFile(createFile('sample.txt'))).toBe(false);
	});

	it('同じベース名かつ同じパス階層の sidecar のみ対応付ける', () => {
		const imageFile = createFile('ortho.tif', 'a/ortho.tif');
		const worldFile = createFile('ortho.tfw', 'a/ortho.tfw');
		const auxXmlFile = createFile('ortho.tif.aux.xml', 'a/ortho.tif.aux.xml');
		const wrongFolderWorldFile = createFile('ortho.tfw', 'b/ortho.tfw');

		expect(hasMatchingRasterSidecar(imageFile, worldFile)).toBe(true);
		expect(hasMatchingRasterSidecar(imageFile, auxXmlFile)).toBe(true);
		expect(hasMatchingRasterSidecar(imageFile, wrongFolderWorldFile)).toBe(false);
	});

	it('対応する sidecar がある画像を優先して見つける', () => {
		const plainImage = createFile('plain.jpg', 'images/plain.jpg');
		const geoImage = createFile('map.jpg', 'images/map.jpg');
		const worldFile = createFile('map.jgw', 'images/map.jgw');
		const auxXmlFile = createFile('map.jpg.aux.xml', 'images/map.jpg.aux.xml');

		expect(findGeoReferencedImageFile([plainImage, geoImage, worldFile])).toBe(geoImage);
		expect(findMatchingWorldFile([plainImage, geoImage, worldFile], geoImage)).toBe(worldFile);
		expect(findMatchingAuxXmlFile([plainImage, geoImage, auxXmlFile], geoImage)).toBe(auxXmlFile);
	});
});
