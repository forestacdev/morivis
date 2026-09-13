import { describe, expect, it } from 'vitest';

import { buildTerrainSurface } from './surface-terrain';

const cloud = (gap = false) => {
	const positions: number[] = [], colors: number[] = [];
	for (let y = 0; y <= 64; y++) {
		for (let x = 0; x <= 128; x++) {
			if (gap && x === 64) continue;
			positions.push(x / 32, y / 32, -10 + x / 32 + y / 64);
			colors.push(0, 0, 255);
		}
	}
	return {
		positions: new Float32Array(positions),
		colors: new Uint8Array(colors),
		resolution: 32,
		radius: 2
	};
};

describe('highest-point terrain mesh', () => {
	it('connects the height field with upward normals and includes the maximum bounds', () => {
		const result = buildTerrainSurface(cloud());
		expect(result.cellSize).toBe(1 / 32);
		expect(result.triangleCount).toBe(128 * 64 * 2);
		const mesh = result.chunks[0];
		expect([...mesh.positions.slice(-3)]).toEqual([4, -5, -2]);
		for (let i = 0; i < mesh.positions.length; i += 3) {
			expect(mesh.positions[i + 1]).toBeCloseTo(
				-10 + mesh.positions[i] - mesh.positions[i + 2] / 2
			);
			expect(mesh.normals[i + 1]).toBeGreaterThan(0);
		}
	});

	it('uses the highest sample and its RGB, including when all heights are negative', () => {
		const input = cloud();
		const positions = new Float32Array([...input.positions, 1, 1, -2, 1, 1, -20, NaN, 1, 100]);
		const colors = new Uint8Array([...input.colors!, 255, 0, 0, 0, 255, 0, 0, 255, 0]);
		const mesh = buildTerrainSurface({ ...input, positions, colors }).chunks[0];
		const offset = (32 * 129 + 32) * 3;
		expect([...mesh.positions.slice(offset, offset + 3)]).toEqual([1, -2, -1]);
		expect([...mesh.colors.slice(offset, offset + 3)]).toEqual([1, 0, 0]);
	});

	it('leaves an unobserved strip open instead of connecting across it', () => {
		const result = buildTerrainSurface(cloud(true));
		expect(result.triangleCount).toBe(126 * 64 * 2);
		const mesh = result.chunks[0];
		for (let i = 0; i < mesh.indices.length; i += 3) {
			const xs = [...mesh.indices.slice(i, i + 3)].map(id => mesh.positions[id * 3]);
			expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(result.cellSize);
		}
	});

	it('rejects invalid or disconnected input with an actionable error', () => {
		expect(() => buildTerrainSurface({ ...cloud(), resolution: 0 })).toThrow('細かさ');
		expect(() => buildTerrainSurface({ ...cloud(), colors: new Uint8Array(3) })).toThrow('RGB');
		expect(() =>
			buildTerrainSurface({
				...cloud(),
				positions: new Float32Array([0, 0, 0, 0, 1, 0, 0, 2, 0]),
				colors: undefined
			})
		).toThrow('XY方向');
		expect(() =>
			buildTerrainSurface({
				...cloud(),
				positions: new Float32Array([0, 0, 0, 1, 1, 0, 2, 0, 0]),
				colors: undefined
			})
		).toThrow('細かさ');
	});
});
