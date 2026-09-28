import type { OpenJpeg } from '@cornerstonejs/codec-openjpeg/decodewasmjs';
import { writeArrayBuffer } from 'geotiff';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import proj4 from 'proj4';
import { beforeAll, describe, expect, it } from 'vitest';
import { projectRawRaster } from '../envi-bil/project';
import { decodeJp2 } from '.';
import { inspectCodestream, parseJp2Container } from './boxes';
import { findJp2Files } from './files';
import { readGeoJp2, readJp2Sidecars } from './metadata';
const require = createRequire(import.meta.url);
let codec: OpenJpeg;
const fixture = (name: string) =>
	new File([readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url))], name);
const values = JSON.parse(
	readFileSync(new URL('./__fixtures__/test-values.json', import.meta.url), 'utf8')
);
beforeAll(async () => {
	codec = await require('@cornerstonejs/codec-openjpeg/decodewasmjs')({
		wasmBinary: readFileSync(require.resolve('@cornerstonejs/codec-openjpeg/decodewasm')),
		print: () => {},
		printErr: () => {}
	});
});
describe('JPEG2000 / GeoJP2', () => {
	it('未対応のアルファを表示バンドへ混ぜずに通知する', async () => {
		await expect(decodeJp2({ image: fixture('test-alpha.jp2') }, codec)).rejects.toThrow(
			'アルファ'
		);
	});
	it('実際のOpenJPEGでRGBを復号し、色値を保持する', async () => {
		const grid = await decodeJp2({ image: fixture('test-geojp2.jp2') }, codec);
		expect(grid.bandCount).toBe(3);
		expect(grid.bands.map(b => [...b])).toEqual(
			[0, 1, 2].map(c => values.rgb.filter((_: number, i: number) => i % 3 === c))
		);
		expect(grid.transform).toEqual([2, 0.01, 0, 1, 0, -0.01]);
		expect(grid.bbox).toEqual([2, 0.96, 2.04, 1]);
		expect(grid.crs).not.toBe('');
		expect(grid.ranges).toEqual(Array(3).fill({ min: 0, max: 255 }));
	});
	it.each([['test-height', 'gray'], ['test-signed', 'signed']])(
		'16bit値を8bit化せずに読む: %s',
		async (name, key) => {
			const grid = await decodeJp2({ image: fixture(`${name}.jp2`) }, codec);
			expect([...grid.bands[0]]).toEqual(values[key]);
		}
	);
	it('投影座標のGeoJP2をWGS84へ変換する', async () => {
		const raw = await decodeJp2({ image: fixture('test-projected.jp2') }, codec);
		expect(raw.bbox).toEqual([1000, 1960, 1040, 2000]);
		const projected = projectRawRaster(raw, raw.crs);
		const point = proj4('EPSG:3857', 'EPSG:4326', [1000, 1960]);
		expect(projected.bbox[0]).toBeCloseTo(point[0], 9);
		expect(projected.bbox[1]).toBeCloseTo(point[1], 9);
		expect(projected.bands[0]).toEqual(raw.bands[0]);
	});
	it('位置と座標系の有無を区別し、数値範囲から推測しない', async () => {
		const plain = await decodeJp2({ image: fixture('test-color.jp2') }, codec);
		expect(plain.transform).toBeNull();
		expect(plain.crs).toBe('');
		const unknown = await decodeJp2({ image: fixture('test-unknown.jp2') }, codec);
		expect(unknown.transform).not.toBeNull();
		expect(unknown.crs).toBe('');
	});
	it('ワールドファイルの中心座標を外縁へ変換しPRJを適用する', async () => {
		const image = fixture('test-color.jp2');
		const grid = await decodeJp2(
			findJp2Files([image, fixture('test-color.j2w'), fixture('test-color.prj')], image),
			codec
		);
		expect(grid.transform?.[0]).toBeCloseTo(2, 10);
		expect(grid.transform?.[3]).toBeCloseTo(1, 10);
		expect(grid.crs).toBe('EPSG:4326');
	});
	it('GeoTIFFの回転行列とPixelIsPointの半画素補正を保つ', async () => {
		const buffer = writeArrayBuffer([0], {
			width: 1,
			height: 1,
			ModelTransformation: [2, 1, 0, 10, -1, -2, 0, 20, 0, 0, 1, 0, 0, 0, 0, 1],
			GTRasterTypeGeoKey: 2,
			GeographicTypeGeoKey: 4326
		});
		const spatial = await readGeoJp2(buffer);
		expect(spatial.transform).toEqual([8.5, 2, 1, 21.5, -1, -2]);
	});
	it('AUX.XMLのGeoTransformは外縁として扱い、NoDataを欠損にする', async () => {
		const aux = new File([
			'<PAMDataset><SRS>EPSG:4326</SRS><GeoTransform>2,0.01,0,1,0,-0.01</GeoTransform><PAMRasterBand band="1"><NoDataValue>0</NoDataValue></PAMRasterBand></PAMDataset>'
		], 'test-color.jp2.aux.xml');
		const grid = await decodeJp2({ image: fixture('test-color.jp2'), aux }, codec);
		expect(grid.transform).toEqual([2, 0.01, 0, 1, 0, -0.01]);
		expect(grid.bands[0][0]).toBeNaN();
	});
	it('フォルダとベース名を照合し、曖昧な付属ファイルは拒否する', () => {
		const image = Object.assign(fixture('test-color.jp2'), {
			morivisRelativePath: 'test-a/test-color.jp2'
		});
		const world = Object.assign(fixture('test-color.j2w'), {
			morivisRelativePath: 'test-a/test-color.j2w'
		});
		expect(findJp2Files([image, fixture('test-color.j2w'), world], image).world).toBe(world);
		expect(() => findJp2Files([image, world, world], image)).toThrow('重複');
	});
	it('壊れたJP2・切断されたボックス・過大な画像を復号前に拒否する', async () => {
		expect(() => parseJp2Container(new ArrayBuffer(12))).toThrow('JP2');
		const buffer = await fixture('test-color.jp2').arrayBuffer();
		expect(() => parseJp2Container(buffer.slice(0, -1))).toThrow('ボックス');
		const stream = parseJp2Container(buffer).codestream.slice();
		new DataView(stream.buffer).setUint32(8, 0xffffffff);
		expect(() => inspectCodestream(stream)).toThrow('サンプル');
		await expect(
			readJp2Sidecars({ transform: null, crs: '', nodata: null }, {
				world: new File(['1 2'], 'test.j2w')
			})
		).rejects.toThrow('ワールド');
	});
});
