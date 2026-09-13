import { describe, expect, it } from 'vitest';

import { reconstructSurfaceChunks, type SurfaceChunk } from './surface-chunks';

const plane = () => {
	const points: number[] = [], colors: number[] = [];
	for (let x = -24; x <= 24; x++) {
		for (let y = -24; y <= 24; y++) {
			points.push(x / 12, y / 12, x / 48 + y / 96);
			colors.push(x < 0 ? 255 : 0, 0, x < 0 ? 0 : 255);
		}
	}
	return {
		positions: new Float32Array(points),
		colors: new Uint8Array(colors),
		resolution: 32,
		radius: 2
	};
};

const triangles = (chunks: SurfaceChunk[]) =>
	chunks.flatMap(chunk => {
		const keys: string[] = [];
		for (let i = 0; i < chunk.indices.length; i += 3) {
			const triangle = [...chunk.indices.subarray(i, i + 3)].map(id =>
				[
					...chunk.positions.subarray(id * 3, id * 3 + 3),
					...chunk.normals.subarray(id * 3, id * 3 + 3),
					...chunk.colors.subarray(id * 3, id * 3 + 3)
				].join(',')
			);
			keys.push(triangle.sort().join('|'));
		}
		return keys;
	}).sort();

describe('surface reconstruction in shared grid blocks', () => {
	it('produces identical triangles, colors and normals with different block boundaries', () => {
		const input = plane();
		const small = reconstructSurfaceChunks(input, undefined, 16);
		const large = reconstructSurfaceChunks(input, undefined, 48);
		expect(small.chunks.length).toBeGreaterThan(large.chunks.length);
		expect(triangles(small.chunks)).toEqual(triangles(large.chunks));
		expect(small.triangleCount).toBeGreaterThan(0);
		for (const chunk of small.chunks) {
			for (let i = 0; i < chunk.positions.length; i += 3) {
				const [x, up, south] = chunk.positions.subarray(i, i + 3);
				expect(up).toBeCloseTo(x / 4 - south / 8, 5);
			}
		}
	});

	it('keeps oriented faces consistent with their normals on a curved surface', () => {
		const points: number[] = [];
		for (let i = 0; i < 3000; i++) {
			const z = 1 - 2 * (i + 0.5) / 3000,
				angle = i * Math.PI * (3 - Math.sqrt(5)),
				r = Math.sqrt(1 - z * z);
			points.push(r * Math.cos(angle), r * Math.sin(angle), z);
		}
		const result = reconstructSurfaceChunks({
			positions: new Float32Array(points),
			resolution: 32,
			radius: 2
		});
		let volume = 0;
		for (const chunk of result.chunks) {
			for (let i = 0; i < chunk.indices.length; i += 3) {
				const [a, b, c] = [...chunk.indices.subarray(i, i + 3)].map(id => id * 3),
					p = chunk.positions;
				const ab = [0, 1, 2].map(axis => p[b + axis] - p[a + axis]),
					ac = [0, 1, 2].map(axis => p[c + axis] - p[a + axis]);
				const cross = [
					ab[1] * ac[2] - ab[2] * ac[1],
					ab[2] * ac[0] - ab[0] * ac[2],
					ab[0] * ac[1] - ab[1] * ac[0]
				];
				volume += cross.reduce((sum, value, axis) => sum + value * p[a + axis], 0) / 6;
				expect(cross.reduce((sum, value, axis) => sum + value * chunk.normals[a + axis], 0))
					.toBeGreaterThanOrEqual(-1e-8);
			}
		}
		expect(volume).toBeGreaterThan(4);
		expect(volume).toBeLessThan(4.5);
	});

	it('validates settings and rejects samples that cannot define a surface', () => {
		expect(() => reconstructSurfaceChunks({ ...plane(), resolution: 256 })).toThrow('細かさ');
		expect(() => reconstructSurfaceChunks({ ...plane(), radius: NaN })).toThrow('つながり');
		expect(() =>
			reconstructSurfaceChunks({
				positions: new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]),
				resolution: 32,
				radius: 2
			})
		).toThrow('表面を復元');
	});
});
