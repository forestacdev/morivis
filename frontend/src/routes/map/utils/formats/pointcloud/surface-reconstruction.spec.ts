import { describe, expect, it } from 'vitest';

import { reconstructPointCloudSurface } from './surface-reconstruction';

describe('tangent plane surface reconstruction', () => {
	it('reconstructs a single vertical sheet through the samples, without an inflated shell', () => {
		const points: number[] = [];
		for (let y = -16; y <= 16; y++) {
			for (let z = -16; z <= 16; z++) points.push(3, y / 8, z / 8 + 10);
		}
		const positions = new Float32Array(points);
		const result = reconstructPointCloudSurface({
			positions,
			colors: new Uint8Array(points.length).fill(128),
			resolution: 48,
			radius: 2
		});
		expect(result.positions.length).toBeGreaterThan(0);
		let area = 0;
		for (let i = 0; i < result.positions.length; i += 9) {
			const p = result.positions;
			for (let vertex = 0; vertex < 9; vertex += 3) {
				expect(p[i + vertex]).toBeCloseTo(3, 5);
				expect(Math.abs(result.normals[i + vertex])).toBeCloseTo(1, 5);
				expect(result.colors[i + vertex]).toBeCloseTo(0.21586, 4);
			}
			area += Math.abs(
				(p[i + 4] - p[i + 1]) * (p[i + 8] - p[i + 2])
					- (p[i + 5] - p[i + 2]) * (p[i + 7] - p[i + 1])
			) / 2;
		}
		expect(area).toBeGreaterThan(15);
		expect(area).toBeLessThan(24);
	});

	it('follows a tilted plane and keeps separate colored walls apart', () => {
		const points: number[] = [], colors: number[] = [];
		for (const side of [-1, 1]) {
			for (let y = -12; y <= 12; y++) {
				for (let z = -12; z <= 12; z++) {
					points.push(side * 2 + y / 32, y / 8, z / 8);
					colors.push(...(side < 0 ? [255, 0, 0] : [0, 0, 255]));
				}
			}
		}
		const result = reconstructPointCloudSurface({
			positions: new Float32Array(points),
			colors: new Uint8Array(colors),
			resolution: 64,
			radius: 2
		});
		for (let i = 0; i < result.positions.length; i += 3) {
			const x = result.positions[i], north = -result.positions[i + 2];
			expect(Math.abs(x - north / 4)).toBeCloseTo(2, 4);
			expect([...result.colors.subarray(i, i + 3)]).toEqual(x < 0 ? [1, 0, 0] : [0, 0, 1]);
		}
	});

	it('reconstructs a closed curved surface with consistent outward normals', () => {
		const points: number[] = [];
		for (let i = 0; i < 2500; i++) {
			const z = 1 - 2 * (i + 0.5) / 2500;
			const angle = i * Math.PI * (3 - Math.sqrt(5));
			const r = Math.sqrt(1 - z * z);
			points.push(r * Math.cos(angle), r * Math.sin(angle), z);
		}
		const result = reconstructPointCloudSurface({
			positions: new Float32Array(points),
			resolution: 64,
			radius: 2
		});
		let volume = 0, maxDeviation = 0, minAlignment = 1;
		for (let i = 0; i < result.positions.length; i += 9) {
			const p = result.positions;
			volume += (p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7])
				+ p[i + 1] * (p[i + 5] * p[i + 6] - p[i + 3] * p[i + 8])
				+ p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6])) / 6;
			for (let vertex = 0; vertex < 9; vertex += 3) {
				const j = i + vertex;
				const distance = Math.hypot(p[j], p[j + 1], p[j + 2]);
				maxDeviation = Math.max(maxDeviation, Math.abs(distance - 1));
				minAlignment = Math.min(
					minAlignment,
					(p[j] * result.normals[j] + p[j + 1] * result.normals[j + 1]
						+ p[j + 2] * result.normals[j + 2]) / distance
				);
			}
		}
		expect(maxDeviation).toBeLessThan(0.04);
		expect(minAlignment).toBeGreaterThan(0.98);
		expect(volume).toBeGreaterThan(4);
		expect(volume).toBeLessThan(4.4);
	});

	it('rejects collinear samples instead of inventing a tube', () => {
		expect(() =>
			reconstructPointCloudSurface({
				positions: new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0]),
				resolution: 32,
				radius: 2
			})
		).toThrow('表面を復元');
	});
});
