import { describe, expect, it } from 'vitest';

import { parseDxf } from './index';
import { createDxfModel, disposeDxfModel } from './mesh';

type Pair = [number, string | number];
type Position = [number, number, number];
const QUAD: Position[] = [[0, 0, 2], [4, 0, 2], [4, 3, 2], [0, 3, 2]];
const TRIANGLE = QUAD.slice(0, 3);
const facePairs = (points: Position[], trailing: Pair[] = []): Pair[] => [
	[0, '3DFACE'],
	[8, 'test-face'],
	[62, 1],
	...points.flatMap(([x, y, z], index): Pair[] => [
		[10 + index, x],
		[20 + index, y],
		[30 + index, z]
	]),
	...trailing
];
const document = (entities: Pair[]) =>
	[
		[0, 'SECTION'],
		[2, 'ENTITIES'],
		...entities,
		[0, 'ENDSEC'],
		[0, 'EOF']
	].flat().join('\n');

describe('DXF 3DFACE handler', () => {
	it.each([0, 15])('頂点の後に辺フラグ %i がある四角形の全頂点を保持する', (flags) => {
		const { geojson } = parseDxf(document(facePairs(QUAD, [[70, flags]])), 'm');
		expect(geojson.features[0].geometry.coordinates).toEqual([[...QUAD, QUAD[0]]]);
		expect(geojson.features[0].properties).toMatchObject({
			layer: 'test-face',
			color: '#ff0000'
		});
	});

	it('第4頂点を省略した三角形でも末尾の属性によって頂点を失わない', () => {
		const { geojson } = parseDxf(document(facePairs(TRIANGLE, [[70, 7]])), 'm');
		expect(geojson.features).toHaveLength(1);
		expect(geojson.features[0].geometry.coordinates).toEqual([[...TRIANGLE, TRIANGLE[0]]]);
	});

	it('第3・第4頂点が同じ三角形を正規化する', () => {
		const { geojson } = parseDxf(
			document(facePairs([...TRIANGLE, TRIANGLE[2]], [[70, 0]])),
			'm'
		);
		expect(geojson.features[0].geometry.coordinates).toEqual([[...TRIANGLE, TRIANGLE[0]]]);
	});

	it('後続の色・レイヤー属性と次のエンティティを読み落とさない', () => {
		const { geojson } = parseDxf(
			document([
				...facePairs(QUAD, [[70, 15], [8, 'test-rear'], [420, 0x123456]]),
				...facePairs(TRIANGLE, [[70, 0]]),
				[0, 'LINE'],
				[8, 'test-line'],
				[10, 1],
				[20, 2],
				[11, 3],
				[21, 4]
			]),
			'mm'
		);
		expect(geojson.features).toHaveLength(3);
		expect(geojson.features[0].properties).toMatchObject({
			layer: 'test-rear',
			color: '#123456'
		});
		expect(geojson.features[0].geometry.coordinates).toEqual([
			[...QUAD, QUAD[0]].map(point => point.map(value => value / 1000))
		]);
		expect(geojson.features[1].geometry.coordinates).toHaveLength(1);
		expect(geojson.features[2].geometry).toEqual({
			type: 'LineString',
			coordinates: [[0.001, 0.002], [0.003, 0.004]]
		});
	});

	it('末尾に属性がある四角形を面積を欠かさずレイヤー別メッシュへ渡す', () => {
		const { geojson } = parseDxf(
			document([
				...facePairs(QUAD, [[70, 15]]),
				...facePairs(TRIANGLE, [[70, 0], [8, 'test-other']])
			]),
			'm'
		);
		const model = createDxfModel(geojson);
		try {
			expect(model.children.map(mesh => mesh.name)).toEqual(['test-face', 'test-other']);
			const mesh = model.children[0] as ReturnType<typeof import('./mesh').createDxfMesh>;
			const positions = mesh.geometry.getAttribute('position');
			expect(positions.count).toBe(6);
			let area = 0;
			for (let i = 0; i < positions.count; i += 3) {
				const ax = positions.getX(i + 1) - positions.getX(i);
				const az = positions.getZ(i + 1) - positions.getZ(i);
				const bx = positions.getX(i + 2) - positions.getX(i);
				const bz = positions.getZ(i + 2) - positions.getZ(i);
				area += Math.abs(ax * bz - az * bx) / 2;
			}
			expect(area).toBe(12);
		} finally {
			disposeDxfModel(model);
		}
	});
});
