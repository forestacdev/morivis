import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRawRaster, parseRawRasterHeader } from '.';

export const fixtureText = (name: string) =>
	readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');
const header = fixtureText('test-color.hdr');
const read = (
	text: string,
	values: number[],
	type: 'Int16' | 'Float32' | 'Float64' | 'Uint32' = 'Int16',
	little = true
) => {
	const bytes = type === 'Int16' ? 2 : type === 'Float64' ? 8 : 4;
	const buffer = new ArrayBuffer(values.length * bytes);
	const view = new DataView(buffer);
	values.forEach((value, index) => view[`set${type}`](index * bytes, value, little));
	return parseRawRaster(parseRawRasterHeader(text), buffer);
};

describe('ENVI / ESRI raw raster', () => {
	it.each(
		[
			['bil', [1, 2, -9999, 11, 12, 13, 21, 22, 23, 4, 0, -2, 14, 15, 16, 24, 25, 26]],
			['bip', [1, 11, 21, 2, 12, 22, -9999, 13, 23, 4, 14, 24, 0, 15, 25, -2, 16, 26]],
			['bsq', [1, 2, -9999, 4, 0, -2, 11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26]]
		] as const
	)('%sをバンドごとの北から南のセル順にする', (layout, values) => {
		const grid = read(header.replace('interleave = bil', `interleave = ${layout}`), [
			...values
		]);
		expect(grid.bands.map(band => [...band])).toEqual([[1, 2, NaN, 4, 0, -2], [
			11,
			12,
			13,
			14,
			15,
			16
		], [21, 22, 23, 24, 25, 26]]);
		expect(grid.ranges).toEqual([{ min: -2, max: 4 }, { min: 11, max: 16 }, {
			min: 21,
			max: 26
		}]);
		expect(grid.defaultBands).toEqual([2, 1, 0]);
		expect(grid.crs).toBe('EPSG:4326');
		expect(grid.bbox[0]).toBe(2.5);
		expect(grid.bbox[3]).toBe(1.25);
	});
	it('ESRIの大端浮動小数と中心座標を解釈する', () => {
		const grid = read(
			fixtureText('test-height.hdr'),
			[1.5, 2, -9999, 4, 0, -2.5],
			'Float32',
			false
		);
		expect([...grid.bands[0]]).toEqual([1.5, 2, NaN, 4, 0, -2.5]);
		expect(grid.bbox[0]).toBeCloseTo(2.5, 12);
		expect(grid.bbox[3]).toBeCloseTo(1.25, 12);
		expect(grid.crs).toBe('');
	});
	it('BILの先頭・バンド行・行末の余白を読み飛ばす', () => {
		const grid = read(
			'NCOLS 2\nNROWS 2\nNBANDS 2\nNBITS 16\nLAYOUT BIL\nSKIPBYTES 2\nBANDROWBYTES 6\nTOTALROWBYTES 14',
			[99, 1, 2, 99, 11, 12, 99, 99, 3, 4, 99, 13, 14]
		);
		expect(grid.bands.map(band => [...band])).toEqual([[1, 2, 3, 4], [11, 12, 13, 14]]);
	});
	it('BSQのバンド間余白とBIPの行末余白を読む', () => {
		const base = 'NCOLS 2\nNROWS 2\nNBANDS 2\nNBITS 16\n';
		expect(
			read(base + 'LAYOUT BSQ\nBANDGAPBYTES 2', [1, 2, 3, 4, 99, 11, 12, 13, 14]).bands.map(
				b => [...b]
			)
		)
			.toEqual([[1, 2, 3, 4], [11, 12, 13, 14]]);
		expect(
			read(base + 'LAYOUT BIP\nTOTALROWBYTES 10', [1, 11, 2, 12, 99, 3, 13, 4, 14]).bands.map(
				b => [...b]
			)
		)
			.toEqual([[1, 2, 3, 4], [11, 12, 13, 14]]);
	});
	it('float32の丸めを含むnodataとNaN・Infinityを欠損にする', () => {
		const grid = read(
			'NCOLS 4\nNROWS 1\nNBITS 32\nPIXELTYPE FLOAT\nNODATA_VALUE -3.402823466e38',
			[-3.402823466e38, NaN, Infinity, 0],
			'Float32'
		);
		expect([...grid.bands[0]]).toEqual([NaN, NaN, NaN, 0]);
	});
	it.each([['Float64', 5, 1.25], ['Uint32', 13, 4000000000]] as const)(
		'%sの精度と符号を保持する',
		(type, code, value) => {
			const text =
				`ENVI\nsamples = 1\nlines = 1\nbands = 1\ninterleave = bsq\ndata type = ${code}\nbyte order = 1`;
			expect(read(text, [value], type, false).bands[0][0]).toBe(value);
		}
	);
	it('未知のdatumや座標のない画像をWGS84と推定しない', () => {
		expect(parseRawRasterHeader(header.replace('WGS-84', 'test-datum')).crs).toBe('');
		expect(parseRawRasterHeader('NCOLS 2\nNROWS 2').transform).toBeNull();
	});
	it('UTM南半球と複数行WKTを読む', () => {
		const utm = header.replace(
			/map info = .*\n/,
			'map info = {UTM, 1, 1, 500000, 1000000, 10, 10, 31, South, WGS-84, units=Meters}\n'
		);
		expect(parseRawRasterHeader(utm).crs).toContain('+zone=31 +south');
		const wkt = fixtureText('test-height.prj').trim();
		expect(parseRawRasterHeader(header + `\ncoordinate system string = {\n${wkt}\n}`).crs).toBe(
			wkt
		);
	});
	it('回転と1始まりの参照画素を外縁のアフィン変換にする', () => {
		const grid = parseRawRasterHeader(
			header.replace(
				/map info = .*\n/,
				'map info = {test, 2, 3, 20, 30, 2, 3, rotation=90}\n'
			)
		);
		expect(grid.transform?.[0]).toBe(18);
		expect(grid.transform?.[3]).toBe(36);
		expect(grid.transform?.[2]).toBeCloseTo(2);
		expect(grid.transform?.[4]).toBeCloseTo(3);
	});
	it.each([
		['samples = 3', 'samples = 0'],
		['lines = 2', 'lines = 1.5'],
		['bands = 3', 'bands = 99999999'],
		['data type = 2', 'data type = 6'],
		['data type = 2', 'data type = 14'],
		['byte order = 0', 'byte order = 9'],
		['interleave = bil', 'interleave = invalid'],
		['default bands = {3, 2, 1}', 'default bands = {4}'],
		['samples = 3', 'samples = 3\nsamples = 3'],
		['header offset = 0', 'header offset = -1'],
		['file type = ENVI Standard', 'file type = ENVI Spectral Library']
	])('不正・未対応のHDRを拒否する: %s', (before, after) => {
		expect(() => parseRawRasterHeader(header.replace(before, after))).toThrow();
	});
	it('短い本体、全欠損、packedビット、圧縮を明示的に拒否する', () => {
		expect(() => read(header, [1])).toThrow('短く');
		expect(() => read('NCOLS 1\nNROWS 1\nNBITS 16\nPIXELTYPE SIGNEDINT\nNODATA -9999', [-9999]))
			.toThrow('欠損値以外');
		expect(() => parseRawRasterHeader('NCOLS 1\nNROWS 1\nNBITS 4')).toThrow('bit');
		expect(() => parseRawRasterHeader(header + '\nfile compression = 1')).toThrow('圧縮');
	});
});
