import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseVtk, summarizeVtk } from '.';
import { legacyBinary, xmlSurface } from './__fixtures__/builders';
import { formatVtk } from './definition';
import { checkVtkFileSize, createArrayBudget } from './numeric';
import { extractVtkSurface } from './surface';

const fixture = (name: string) =>
	new Uint8Array(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url))).buffer;
const textBuffer = (text: string) => new TextEncoder().encode(text).buffer;
const mutate = (buffer: ArrayBuffer, from: string, to: string) =>
	textBuffer(new TextDecoder().decode(buffer).replace(from, to));

describe('VTKの入力と外表面', () => {
	it('凹ポリゴンを面積を保って三角形化し、CELL_DATAの点・線分を飛ばす', () => {
		const data = parseVtk(fixture('test-surface.vtk'));
		const surface = extractVtkSurface(data);
		expect(summarizeVtk(data, surface)).toMatchObject({
			pointCount: 5,
			cellCount: 3,
			triangleCount: 3,
			ignoredCellCount: 2
		});
		expect(Array.from(surface.cellIndices)).toEqual([2, 2, 2]);
		let area = 0;
		for (let i = 0; i < surface.pointIndices.length; i += 3) {
			const [a, b, c] = Array.from(
				surface.pointIndices.slice(i, i + 3),
				id => Array.from(data.points.slice(id * 3, id * 3 + 3))
			);
			const signed = ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
			expect(signed).toBeGreaterThan(0);
			area += signed;
		}
		expect(area).toBe(12);
		expect(summarizeVtk(data).scalars).toEqual([
			{ id: '0', name: 'test-temperature', association: 'point', min: 0, max: 40 },
			{ id: '1', name: 'test-pressure', association: 'cell', min: 10, max: 30 }
		]);
	});
	it('Legacy binaryのbig endian座標・接続・スカラーを読む', () => {
		const data = parseVtk(legacyBinary());
		expect(Array.from(data.points)).toEqual([0, 0, 0, 2, 0, 0, 0, 2, 0]);
		expect(Array.from(data.scalars[0].values)).toEqual([4, 5, 6]);
		expect(summarizeVtk(data).triangleCount).toBe(1);
	});
	it('Legacy 5.1のOFFSETS / CONNECTIVITYを読む', () => {
		const input = mutate(
			fixture('test-surface.vtk'),
			'POLYGONS 1 6\n5 0 1 2 3 4',
			'POLYGONS 2 5\nOFFSETS vtktypeint64\n0 5\nCONNECTIVITY vtktypeint64\n0 1 2 3 4'
		);
		expect(summarizeVtk(parseVtk(input)).triangleCount).toBe(3);
	});
	it('接する四面体の共有面を除き、セル属性の対応を保つ', () => {
		const data = parseVtk(fixture('test-volumes.vtu'));
		const surface = extractVtkSurface(data);
		expect(surface.cellIndices).toHaveLength(6);
		expect(Array.from(surface.cellIndices).filter(value => value === 0)).toHaveLength(3);
		expect(Array.from(surface.cellIndices).filter(value => value === 1)).toHaveLength(3);
		for (let i = 0; i < surface.pointIndices.length; i += 3) {
			expect(Array.from(surface.pointIndices.slice(i, i + 3)).sort()).not.toEqual([0, 1, 2]);
		}
	});
	it('Legacy UNSTRUCTURED_GRIDでも四面体を外表面へ変換する', () => {
		const data = parseVtk(
			textBuffer(
				'# vtk DataFile Version 3.0\ntest-tet\nASCII\nDATASET UNSTRUCTURED_GRID\nPOINTS 4 float\n0 0 0 2 0 0 0 2 0 0 0 2\nCELLS 1 5\n4 0 1 2 3\nCELL_TYPES 1\n10\n'
			)
		);
		expect(summarizeVtk(data).triangleCount).toBe(4);
	});
	it.each([
		{ type: 12, ids: [0, 1, 2, 3, 4, 5, 6, 7], triangles: 12 },
		{ type: 11, ids: [0, 1, 3, 2, 4, 5, 7, 6], triangles: 12 },
		{ type: 13, ids: [0, 1, 3, 4, 5, 7], triangles: 8 },
		{ type: 14, ids: [0, 1, 2, 3, 8], triangles: 6 }
	])('体積セル$typeの外表面を抽出する', ({ type, ids, triangles }) => {
		const points = Float64Array.from([
			0,
			0,
			0,
			2,
			0,
			0,
			2,
			2,
			0,
			0,
			2,
			0,
			0,
			0,
			2,
			2,
			0,
			2,
			2,
			2,
			2,
			0,
			2,
			2,
			1,
			1,
			3
		]);
		expect(
			extractVtkSurface({ points, cells: [{ type, points: ids }], scalars: [] }).cellIndices
		).toHaveLength(triangles);
	});
	it('triangle stripの交互の頂点順を補正する', () => {
		const data = parseVtk(xmlSurface());
		data.cells = [{ type: 6, points: [0, 1, 3, 2] }];
		expect(Array.from(extractVtkSurface(data).pointIndices)).toEqual([0, 1, 3, 3, 1, 2]);
	});
});

describe('VTK XMLの配列エンコーディング', () => {
	it('空のVerts/Linesセクションを持つVTPを読む', () => {
		const source = mutate(xmlSurface(), '<Polys>', '<Verts/><Lines/><Polys>');
		expect(summarizeVtk(parseVtk(source)).triangleCount).toBe(2);
	});
	it.each([
		{ format: 'ascii' as const },
		{ format: 'binary' as const },
		{ format: 'binary' as const, little: false, header64: true },
		{ format: 'binary' as const, compressed: true },
		{ format: 'binary' as const, compressed: true, segmented: true },
		{ format: 'appended' as const },
		{ format: 'appended' as const, segmented: true },
		{ format: 'appended' as const, compressed: true, segmented: true, header64: true },
		{ format: 'appended' as const, raw: true, little: false },
		{ format: 'appended' as const, compressed: true, raw: true }
	])('ASCIIと同じ点・セル・属性を復元する: %j', options => {
		expect(parseVtk(xmlSurface(options))).toEqual(parseVtk(xmlSurface()));
		expect(summarizeVtk(parseVtk(xmlSurface(options))).triangleCount).toBe(2);
	});
	it('展開サイズが上限を超える圧縮ブロックを展開前に拒否する', () => {
		expect(() => parseVtk(xmlSurface({ format: 'binary', compressed: true, oversized: true })))
			.toThrow('上限');
	});
});

describe('VTKの不正・未対応入力', () => {
	it.each([
		['NumberOfPoints="4"', 'NumberOfPoints="5"', '座標数'],
		['0 1 2 3</DataArray>', '0 1 2 99</DataArray>', '頂点参照'],
		[
			'Name="offsets" NumberOfComponents="1" format="ascii">4',
			'Name="offsets" NumberOfComponents="1" format="ascii">3',
			'長さ'
		],
		['0 0 0 2 0 0', 'NaN 0 0 2 0 0', '有限'],
		['1 2 3 4</DataArray>', '1 2 3</DataArray>', '属性数'],
		['type="PolyData"', 'type="PImageData"', '対応'],
		['</Piece>', '</Piece><Piece/>', 'NumberOfPoints'],
		['byte_order="LittleEndian"', 'byte_order="Other"', 'byte_order'],
		['<VTKFile', '<!DOCTYPE test><VTKFile', 'DTD']
	])('%sの不正を検出する', (from, to, message) => {
		expect(() => summarizeVtk(parseVtk(mutate(xmlSurface(), from, to)))).toThrow(message);
	});
	it('未対応の高次セルを黙って省略しない', () => {
		const data = parseVtk(fixture('test-volumes.vtu'));
		data.cells[0].type = 69;
		expect(() => extractVtkSurface(data)).toThrow('未対応のセル型');
	});
	it('点と線だけなら理由を示す', () => {
		const data = parseVtk(xmlSurface());
		data.cells = [{ type: 4, points: [0, 1] }];
		expect(() => extractVtkSurface(data)).toThrow('点・線のみ');
	});
	it('切れたLegacy binaryと属性数不一致を拒否する', () => {
		expect(() => parseVtk(legacyBinary().slice(0, -8))).toThrow('途中');
		expect(() => parseVtk(mutate(fixture('test-surface.vtk'), 'POINT_DATA 5', 'POINT_DATA 4')))
			.toThrow();
	});
	it('ファイルと展開後の上限ちょうどを許可し、超過を拒否する', () => {
		expect(() => checkVtkFileSize(formatVtk.limits.maxFileBytes)).not.toThrow();
		expect(() => checkVtkFileSize(formatVtk.limits.maxFileBytes + 1)).toThrow('64 MiB');
		const budget = createArrayBudget();
		expect(() => budget(formatVtk.limits.maxExpandedBytes)).not.toThrow();
		expect(() => budget(1)).toThrow('128 MiB');
		expect(() => parseVtk(new ArrayBuffer(0))).toThrow('空');
	});
	it('非有限の解析値は座標と区別し、有限値の範囲を計算する', () => {
		const data = parseVtk(
			mutate(xmlSurface(), '1 2 3 4</DataArray>', 'NaN 2 3 Infinity</DataArray>')
		);
		expect(summarizeVtk(data).scalars[0]).toMatchObject({ min: 2, max: 3 });
	});
});
