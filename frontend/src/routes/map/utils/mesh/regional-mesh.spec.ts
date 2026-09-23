import { describe, expect, it } from 'vitest';
import {
	createRegionalMeshGrid,
	getRegionalMeshCode,
	type MeshBounds,
	REGIONAL_MESH_BOUNDS,
	REGIONAL_MESH_LEVELS
} from './regional-mesh';

describe('地域メッシュの区画とコード', () => {
	it('架空の原点付近でコードの桁と南西からの番号順を確認する', () => {
		expect(getRegionalMeshCode(0, 0, 1)).toBe('0000');
		expect(getRegionalMeshCode(0, 0, 6)).toBe('00000000111');
		expect(getRegionalMeshCode(640, 640, 3)).toBe('01010000');
		expect(getRegionalMeshCode(80 * 3 + 8 * 4 + 4 + 2 + 1, 80 * 2 + 8 * 5 + 4 + 1, 6))
			.toBe('00002354424');
		expect(
			[[0, 0], [4, 0], [0, 4], [4, 4]].map(([x, y]) => getRegionalMeshCode(x, y, 4).slice(-1))
		)
			.toEqual(['1', '2', '3', '4']);
	});

	it.each(REGIONAL_MESH_LEVELS)('レベル$levelの寸法と中心点が一致する', ({ level, step }) => {
		const [west, south] = REGIONAL_MESH_BOUNDS;
		const width = step / 640;
		const height = step / 960;
		const data = createRegionalMeshGrid(level, [
			west + width / 4,
			south + height / 4,
			west + width / 2,
			south + height / 2
		]);
		expect(data.features).toHaveLength(2);
		const [line, point] = data.features;
		expect(line.geometry.type).toBe('LineString');
		if (line.geometry.type !== 'LineString') throw new Error('Expected outline');
		const ring = line.geometry.coordinates;
		expect(ring[1][0] - ring[0][0]).toBeCloseTo(width, 10);
		expect(ring[2][1] - ring[1][1]).toBeCloseTo(height, 10);
		expect(ring[4]).toEqual(ring[0]);
		expect(point.geometry).toEqual({
			type: 'Point',
			coordinates: [(ring[0][0] + ring[1][0]) / 2, (ring[1][1] + ring[2][1]) / 2]
		});
		expect(point.properties).toEqual(line.properties);
	});

	it('隣接範囲では境界の重複や欠落がない', () => {
		const [west, south] = REGIONAL_MESH_BOUNDS;
		for (const { level, step } of REGIONAL_MESH_LEVELS) {
			const width = step / 640;
			const height = step / 960;
			const bounds: MeshBounds = [west, south, west + width, south + height];
			const first = createRegionalMeshGrid(level, bounds);
			const second = createRegionalMeshGrid(level, [
				west + width,
				south,
				west + width * 2,
				south + height
			]);
			expect(first.features).toHaveLength(2);
			expect(second.features).toHaveLength(2);
			expect(first.features[0].properties.code).not.toBe(second.features[0].properties.code);
		}
	});

	it('日本周辺の範囲外と空の範囲には区画を生成しない', () => {
		expect(createRegionalMeshGrid(1, [0, 0, 1, 1]).features).toEqual([]);
		expect(createRegionalMeshGrid(6, [0, 0, 0, 0]).features).toEqual([]);
	});

	it('不正な座標や細かすぎる広域生成を拒否する', () => {
		expect(() => createRegionalMeshGrid(1, [NaN, 0, 1, 1])).toThrow('Invalid');
		expect(() => createRegionalMeshGrid(6, REGIONAL_MESH_BOUNDS)).toThrow('too large');
	});
});
