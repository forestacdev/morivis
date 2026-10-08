import { readFileSync } from 'node:fs';
import { Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { parseVtk, summarizeVtk } from '.';
import { xmlSurface } from './__fixtures__/builders';
import { quadraticVolume } from './__fixtures__/quadratic-builders';
import { createVtkModel, disposeVtkModel, vtkScalarColor } from './model';
import { createArrayBudget } from './numeric';
import { mergeVtkPieces } from './pieces';
import { extractVtkSurface } from './surface';

const text = (name: string) =>
	readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');
const parse = (value: string) => parseVtk(new TextEncoder().encode(value).buffer);
const fixture = (name: string) => parse(text(name));

describe('VTKの構造格子', () => {
	it('ImageDataのExtent・Origin・Spacing・DirectionとPiece境界を反映する', () => {
		const data = fixture('test-grid.vti');
		expect(summarizeVtk(data)).toMatchObject({
			pointCount: 16,
			cellCount: 2,
			triangleCount: 20
		});
		expect(Array.from(data.points.slice(0, 6))).toEqual([13, 24, 30, 13, 26, 30]);
		expect(Array.from(data.points.slice(-3))).toEqual([10, 28, 34]);
		expect(Array.from(data.scalars[0].values)).toEqual([10, 20]);
		const counts = Array.from(extractVtkSurface(data).cellIndices);
		expect(counts.filter(id => id === 0)).toHaveLength(10);
		expect(counts.filter(id => id === 1)).toHaveLength(10);
	});
	it.each(['vtr', 'vts'])('%sの2D格子とセル順序を読む', extension => {
		const data = fixture(`test-grid.${extension}`);
		expect(summarizeVtk(data)).toMatchObject({ pointCount: 6, cellCount: 2, triangleCount: 4 });
		expect(data.cells.map(cell => cell.points)).toEqual([[0, 1, 4, 3], [1, 2, 5, 4]]);
		expect(Array.from(data.scalars[0].values)).toEqual([10, 20]);
		expect(data.points[5]).toBe(extension === 'vtr' ? 4 : 1);
	});
	it.each([
		['STRUCTURED_POINTS', 'DIMENSIONS 3 2 1\nORIGIN 0 0 4\nSPACING 2 3 1'],
		[
			'RECTILINEAR_GRID',
			'DIMENSIONS 3 2 1\nX_COORDINATES 3 float\n0 2 4\nY_COORDINATES 2 float\n0 3\nZ_COORDINATES 1 float\n4'
		],
		['STRUCTURED_GRID', 'DIMENSIONS 3 2 1\nPOINTS 6 float\n0 0 4 2 0 4 4 0 4 0 3 4 2 3 4 4 3 4']
	])('Legacy %sを同じ形状へ復元する', (type, body) => {
		const data = parse(
			`# vtk DataFile Version 3.0\ntest-grid\nASCII\nDATASET ${type}\n${body}\nCELL_DATA 2\nSCALARS test-pressure float\nLOOKUP_TABLE default\n10 20\n`
		);
		expect(Array.from(data.points)).toEqual([
			0,
			0,
			4,
			2,
			0,
			4,
			4,
			0,
			4,
			0,
			3,
			4,
			2,
			3,
			4,
			4,
			3,
			4
		]);
		expect(summarizeVtk(data).triangleCount).toBe(4);
		expect(Array.from(data.scalars[0].values)).toEqual([10, 20]);
	});
	it.each(['1 2 2', '2 1 2', '2 2 1', '2 2 2'])('縮退軸を持つDIMENSIONS %sを扱う', dimensions => {
		const data = parse(
			`# vtk DataFile Version 3.0\ntest-grid\nASCII\nDATASET STRUCTURED_POINTS\nDIMENSIONS ${dimensions}\n`
		);
		expect(summarizeVtk(data).triangleCount).toBe(dimensions === '2 2 2' ? 12 : 2);
	});
	it('1D格子は点・線のみと説明し、巨大・不正なExtentを拒否する', () => {
		const source =
			'# vtk DataFile Version 3.0\ntest-grid\nASCII\nDATASET STRUCTURED_POINTS\nDIMENSIONS ';
		expect(() => summarizeVtk(parse(`${source}1 1 3`))).toThrow('点・線のみ');
		expect(() => parse(`${source}1000000 1000000 2`)).toThrow('上限');
		expect(() => parse(`${source}2 0 2`)).toThrow('DIMENSIONS');
		expect(() => parse(text('test-grid.vti').replace('Extent="2 3', 'Extent="1 3'))).toThrow(
			'範囲外'
		);
		expect(() => parse(text('test-grid.vtr').replace('0 2 5</DataArray>', '0 2</DataArray>')))
			.toThrow('座標数');
	});
});

describe('VTKの複数Piece', () => {
	it('ローカルの点番号を移し、共有面を除き、境界の不連続な点属性を保つ', () => {
		const data = fixture('test-pieces.vtu');
		expect(summarizeVtk(data)).toMatchObject({ pointCount: 8, cellCount: 2, triangleCount: 6 });
		expect(data.cells[1].points).toEqual([5, 4, 6, 7]);
		expect(Array.from(data.scalars[0].values)).toEqual([0, 10, 20, 30, 120, 100, 110, 140]);
		expect(Array.from(data.scalars[1].values)).toEqual([10, 20]);
		const surface = extractVtkSurface(data);
		for (let i = 0; i < surface.cellIndices.length; i++) {
			expect(
				Array.from(surface.pointIndices.slice(i * 3, i * 3 + 3)).every(id =>
					surface.cellIndices[i] === 0 ? id < 4 : id >= 4
				)
			).toBe(true);
		}
	});
	it('欠けたスカラーはNaNで補い、空のPieceも結合できる', () => {
		const source = text('test-pieces.vtu').replace(
			'<DataArray type="Float64" Name="test-pressure">20</DataArray>',
			''
		).replace(
			'</UnstructuredGrid>',
			'<Piece NumberOfPoints="0" NumberOfCells="0"/></UnstructuredGrid>'
		);
		const data = parse(source);
		expect(Array.from(data.scalars[1].values)).toEqual([10, NaN]);
		expect(summarizeVtk(data).triangleCount).toBe(6);
	});
	it.each([false, true])('PolyDataのinline binaryをPieceごとに読む（zlib=%s）', compressed => {
		const source = new TextDecoder().decode(xmlSurface({ format: 'binary', compressed }));
		const piece = source.match(/<Piece[\s\S]*?<\/Piece>/)![0];
		const data = parse(source.replace('</PolyData>', `${piece}</PolyData>`));
		expect(summarizeVtk(data)).toMatchObject({ pointCount: 8, cellCount: 2, triangleCount: 4 });
	});
	it.each([false, true])('複数Pieceのappended配列を読む（raw=%s）', raw => {
		const buffer = xmlSurface({ format: 'appended', compressed: true, raw, header64: true });
		const bytes = new Uint8Array(buffer);
		const marker = new TextEncoder().encode('</PolyData>');
		const offset = bytes.findIndex((_, i) =>
			marker.every((value, j) => bytes[i + j] === value)
		);
		const prefix = new TextDecoder().decode(bytes.subarray(0, offset));
		const piece = new TextEncoder().encode(prefix.match(/<Piece[\s\S]*?<\/Piece>/)![0]);
		const combined = new Uint8Array(bytes.length + piece.length);
		combined.set(bytes.subarray(0, offset));
		combined.set(piece, offset);
		combined.set(bytes.subarray(offset), offset + piece.length);
		expect(summarizeVtk(parseVtk(combined.buffer)).triangleCount).toBe(4);
	});
	it('体積セルの重複と非ゼロghostを黙って取り込まない', () => {
		const piece = fixture('test-volumes.vtu');
		expect(() => extractVtkSurface(mergeVtkPieces([piece, piece], createArrayBudget())))
			.toThrow('重複した体積セル');
		expect(() =>
			parse(text('test-pieces.vtu').replace('Name="test-pressure"', 'Name="vtkGhostType"'))
		).toThrow('ghost');
	});

	it('次のPieceへはみ出す点番号と合計配列予算を拒否する', () => {
		expect(() =>
			parse(text('test-pieces.vtu').replace('0 1 2 3</DataArray>', '0 1 2 4</DataArray>'))
		).toThrow('Piece内');
		const budget = createArrayBudget();
		budget(128 * 1024 * 1024);
		expect(() =>
			mergeVtkPieces([fixture('test-volumes.vtu'), fixture('test-volumes.vtu')], budget)
		).toThrow('128 MiB');
	});
});

describe('VTKの2次セル', () => {
	it('中間節点を通る曲面とスカラーを補間する', () => {
		const data = fixture('test-quadratic.vtu');
		const surface = extractVtkSurface(data);
		expect(summarizeVtk(data, surface)).toMatchObject({ pointCount: 6, triangleCount: 16 });
		const model = createVtkModel(data, { scalarId: '0', upAxis: 'y', unitScale: 1 });
		try {
			const geometry = (model.children[0] as Mesh).geometry;
			const positions = geometry.getAttribute('position');
			const colors = geometry.getAttribute('color');
			let found = false;
			for (let i = 0; i < positions.count; i++) {
				if (positions.getX(i) === 0.5 && positions.getY(i) === 0) {
					found = true;
					expect(positions.getZ(i)).toBe(0.75);
					const expected = vtkScalarColor(6, 0, 8);
					expect([colors.getX(i), colors.getY(i), colors.getZ(i)]).toEqual(
						expect.arrayContaining(
							expected.toArray().map(value => expect.closeTo(value, 5))
						)
					);
				}
			}
			expect(found).toBe(true);
			expect(Array.from(surface.pointIndices)).toContain(3);
		} finally {
			disposeVtkModel(model);
		}
	});
	it.each([[24, 64], [25, 192], [26, 128], [27, 96], [29, 192]])(
		'体積セル%sの全外表面を外向きに生成する',
		(type, triangles) => {
			const data = quadraticVolume(type);
			const surface = extractVtkSurface(data);
			expect(surface.cellIndices).toHaveLength(triangles);
			const center = [0, 1, 2].map(axis =>
				Array.from(data.points).filter((_, i) => i % 3 === axis).reduce((a, b) => a + b, 0)
				/ (data.points.length / 3)
			);
			for (let i = 0; i < surface.pointIndices.length; i += 3) {
				const [a, b, c] = Array.from(
					surface.pointIndices.slice(i, i + 3),
					id => Array.from(surface.points.slice(id * 3, id * 3 + 3))
				);
				const u = b.map((value, axis) => value - a[axis]);
				const v = c.map((value, axis) => value - a[axis]);
				const normal = [
					u[1] * v[2] - u[2] * v[1],
					u[2] * v[0] - u[0] * v[2],
					u[0] * v[1] - u[1] * v[0]
				];
				expect(
					normal.reduce((sum, value, axis) => sum + value * (a[axis] - center[axis]), 0)
				).toBeGreaterThan(0);
			}
		}
	);
	it.each([23, 28])('四角形%sの中点と面中心を補間する', type => {
		const points = [0, 0, 0, 2, 0, 0, 2, 2, 0, 0, 2, 0, 1, 0, 1, 2, 1, 0, 1, 2, 0, 0, 1, 0];
		if (type === 28) points.push(1, 1, 2);
		const surface = extractVtkSurface({
			points: Float64Array.from(points),
			cells: [{ type, points: Array.from({ length: points.length / 3 }, (_, i) => i) }],
			scalars: []
		});
		expect(surface.cellIndices).toHaveLength(32);
		const center = Array.from(surface.pointIndices).find(id =>
			surface.points[id * 3] === 1 && surface.points[id * 3 + 1] === 1
		)!;
		expect(surface.points[center * 3 + 2]).toBe(type === 28 ? 2 : 0.5);
	});
	it('2次四面体の共有面を分割前に除く', () => {
		const data = quadraticVolume(24);
		const mirrored = quadraticVolume(24);
		for (let i = 2; i < mirrored.points.length; i += 3) mirrored.points[i] *= -1;
		const merged = mergeVtkPieces([data, mirrored], createArrayBudget());
		expect(extractVtkSurface(merged).cellIndices).toHaveLength(96);
	});
	it('共有面の次数や中間節点が異なる場合は理由を示す', () => {
		const data = quadraticVolume(24);
		const mirrored = quadraticVolume(24);
		for (let i = 2; i < mirrored.points.length; i += 3) mirrored.points[i] *= -1;
		mirrored.cells = [{ type: 10, points: [0, 1, 2, 3] }];
		expect(() => extractVtkSurface(mergeVtkPieces([data, mirrored], createArrayBudget())))
			.toThrow('共有面の次数');
	});
});
