import { describe, expect, it } from 'vitest';
import {
	arc,
	complex,
	deltaLine,
	drawing,
	element,
	int32,
	multipoint,
	testCurves,
	vax,
	withAttributes,
	word
} from './__fixtures__/builders';
import { readVaxDouble } from './binary';
import { formatDgn } from './definition';
import { parseDgn } from './parser';

const line = () => multipoint([[0, 0], [10, 20]]);
const square = (min: number, max: number) =>
	multipoint([[min, min], [max, min], [max, max], [min, max], [min, min]]);

describe('DGNの単位・原点・バイナリ数値', () => {
	it.each([0, 1, -1, 0.125, -12.5, 1048576.5])('VAX値 %d を読み取る', value => {
		const bytes = new Uint8Array(8);
		vax(bytes, 0, value);
		expect(readVaxDouble(new DataView(bytes.buffer), 0)).toBe(value);
	});
	it('単位名をメートルと推定せず、原点を主単位で差し引く', () => {
		const bytes = drawing([line()], 2, [1, -2, 0]);
		bytes.set([109, 117, 115, 117], 1120);
		const result = parseDgn(bytes);
		expect(result.metadata).toMatchObject({
			masterUnit: 'mu',
			subUnit: 'su',
			subUnitsPerMaster: 10,
			uorPerSubUnit: 100
		});
		expect(result.geojson.features[0].geometry.coordinates).toEqual([[-1, 2], [9, 22]]);
	});
	it('BufferのbyteOffsetを尊重する', () => {
		const bytes = drawing([line()]);
		const padded = new Uint8Array(bytes.length + 16);
		padded.set(bytes, 8);
		expect(parseDgn(padded.subarray(8, -8))).toEqual(parseDgn(bytes));
	});
	it('sub-UOR補正の符号と精度を保持する', () => {
		const coords = parseDgn(drawing([deltaLine()])).geojson.features[0].geometry
			.coordinates as number[][];
		const expected = [[1 + 16384 / 32767 / 1000, 2 - 8192 / 32767 / 1000], [
			3 - 16384 / 32767 / 1000,
			4 + 8192 / 32767 / 1000
		]];
		coords.forEach((p, i) => p.forEach((v, j) => expect(v).toBeCloseTo(expected[i][j], 12)));
	});
});

describe('DGNの図形と属性', () => {
	it('負の円弧角と3D回転をXYへ投影する', () => {
		const coords = parseDgn(drawing([arc(-90)])).geojson.features[0].geometry
			.coordinates as number[][];
		expect(coords[0]).toEqual([15, 20]);
		expect(coords.at(-1)![0]).toBeCloseTo(10);
		expect(coords.at(-1)![1]).toBeCloseTo(18);
		const q = [Math.SQRT1_2, Math.SQRT1_2, 0, 0];
		const rotated = parseDgn(drawing([arc(90, 3, q)], 3)).geojson.features[0].geometry
			.coordinates as number[][];
		expect(rotated[0][0]).toBeCloseTo(15);
		for (const p of rotated) expect(p[1]).toBeCloseTo(20);
	});
	it('同じ座標参照を持つ曲線終点を二重に再投影しない', () => {
		const raw = parseDgn(testCurves());
		const projected = parseDgn(testCurves(), { project: ([x, y]) => [x + 1, y + 1] });
		const a = raw.geojson.features[3].geometry.coordinates as number[][];
		const b = projected.geojson.features[3].geometry.coordinates as number[][];
		expect(b).toEqual(a.map(([x, y]) => [x + 1, y + 1]));
	});
	it('逆向きの辺をつなぎ、内側のリングを穴にする', () => {
		const shape = complex([
			multipoint([[10, 0], [0, 0]]),
			multipoint([[10, 10], [10, 0]]),
			multipoint([[0, 10], [10, 10]]),
			multipoint([[0, 0], [0, 10]]),
			square(2, 4)
		], true);
		const geometry = parseDgn(drawing([shape])).geojson.features[0].geometry;
		expect(geometry.type).toBe('Polygon');
		expect(geometry.coordinates).toHaveLength(2);
	});
	it('複合面の独立した外周をMultiPolygonにする', () => {
		const geometry =
			parseDgn(drawing([complex([square(0, 4), square(10, 14)], true)])).geojson.features[0]
				.geometry;
		expect(geometry.type).toBe('MultiPolygon');
	});
	it('セルの子図形は読み、削除済みの図形を除く', () => {
		const deleted = line();
		deleted[1] |= 0x80;
		const child = line();
		child[0] |= 0x80;
		const result = parseDgn(drawing([element(2, 92), child, deleted]));
		expect(result.geojson.features).toHaveLength(1);
		expect(result.omittedCount).toBe(0);
	});
	it('削除済みの複合図形は子図形も除外する', () => {
		const deleted = complex([line(), line()]);
		deleted[1] |= 0x80;
		const result = parseDgn(drawing([deleted, line()]));
		expect(result.geojson.features).toHaveLength(1);
		expect(result.geojson.features[0].id).toBe(4);
	});
	it('塗り色、色テーブル、DBリンクと未知の属性バイトを保持する', () => {
		const palette = element(5, 806);
		palette.set([12, 34, 56], 41 + 4 * 3);
		const attrs = new Uint8Array(16);
		attrs.set([7, 0x10, 0x41, 0]);
		attrs[8] = 4;
		const shape = withAttributes(multipoint([[0, 0], [2, 0], [2, 2]], 6), attrs);
		const dmrs = new Uint8Array([0, 0, 2, 0, 3, 0, 0, 0, 0xaa, 0xbb]);
		const result = parseDgn(drawing([palette, shape, withAttributes(line(), dmrs)]));
		expect(result.geojson.features[0].properties).toMatchObject({
			ColorIndex: 3,
			FillColorIndex: 4,
			color: '#0c2238'
		});
		expect(result.geojson.features[1].properties).toMatchObject({
			EntityNum: 2,
			MSLink: 3,
			UnparsedAttributes: 'aabb'
		});
		expect(JSON.parse(String(result.geojson.features[1].properties.ULink))['0'][0].size).toBe(
			8
		);
	});
	it('未対応要素と制御レコードを区別し、B-splineの近似を知らせる', () => {
		const result = parseDgn(
			drawing([element(23, 148), element(66, 40), multipoint([[0, 0], [2, 2]], 21)])
		);
		expect(result.omittedCount).toBe(1);
		expect(result.unsupportedTypes).toEqual({ 23: 1 });
		expect(result.approximatedCount).toBe(1);
	});
});

describe('DGNの破損と処理量制限', () => {
	it('頂点数が本文より多いとき、部分成功にしない', () => {
		const corrupt = line();
		word(corrupt, 36, 65535);
		expect(() => parseDgn(drawing([line(), corrupt]))).toThrow('欠損');
	});
	it('属性位置・属性リンク長・単位倍率を検査する', () => {
		const corrupt = line();
		word(corrupt, 32, 0x0800);
		word(corrupt, 30, 65535);
		expect(() => parseDgn(drawing([corrupt]))).toThrow('属性位置');
		expect(() =>
			parseDgn(drawing([withAttributes(line(), new Uint8Array([10, 0x10, 0, 0, 0, 0]))]))
		).toThrow('欠損');
		const bytes = drawing([line()]);
		int32(bytes, 1116, 0);
		expect(() => parseDgn(bytes)).toThrow('単位倍率');
	});
	it('閉じない面や子要素の個数・長さの矛盾を拒否する', () => {
		expect(() => parseDgn(drawing([complex([line()], true)]))).toThrow('閉じていません');
		const group = complex([line()]);
		word(group, 38, 2);
		expect(() => parseDgn(drawing([group]))).toThrow('子要素');
		word(group, 38, 0);
		expect(() => parseDgn(drawing([group]))).toThrow('一致しません');
	});
	it('複合図形の再帰を制限する', () => {
		let group = line();
		for (let i = 0; i < 22; i++) group = complex([group]);
		expect(() => parseDgn(drawing([group]))).toThrow('階層');
	});
	it('円弧半径、短すぎる曲線、空図面を拒否する', () => {
		const invalid = arc();
		vax(invalid, 44, 0);
		expect(() => parseDgn(drawing([invalid]))).toThrow('半径');
		expect(() => parseDgn(drawing([multipoint([[0, 0], [1, 1]], 11)]))).toThrow('6頂点');
		expect(() => parseDgn(drawing([]))).toThrow('表示可能');
	});
	it('緯度経度の範囲外や非数の投影結果を拒否する', () => {
		for (const point of [[181, 0], [0, 91], [NaN, 0], [Infinity, 0]] as [number, number][]) {
			expect(() => parseDgn(drawing([line()]), { project: () => point })).toThrow('座標');
		}
	});
	it.each(
		[
			['maxFeatures', 1, '地物'],
			['maxVertices', 3, '頂点'],
			['maxOutputBytes', 32, '128 MiB']
		] as const
	)('%sを展開中に検査する', (key, limit, message) => {
		const original = formatDgn.limits[key];
		Object.assign(formatDgn.limits, { [key]: limit });
		try {
			expect(() => parseDgn(drawing([line(), line()]))).toThrow(message);
		} finally {
			Object.assign(formatDgn.limits, { [key]: original });
		}
	});
});
