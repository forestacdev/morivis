import { MeshStandardMaterial } from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

import {
	type PointCloudSurfaceGeometry,
	type PointCloudSurfaceInput,
	prepareSurfaceGrid
} from './surface-core';
import { estimateSurfaceNormals } from './surface-normals';

const linear = (value: number) => {
	const c = value / 255;
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/**
 * Local tangent-plane reconstruction with a compact, weighted signed distance field.
 * This is not Poisson reconstruction or photograph-based photogrammetry.
 * Unsupported cells are discarded so a partial scan remains an open surface.
 */
export const reconstructPointCloudSurface = (
	input: PointCloudSurfaceInput
): PointCloudSurfaceGeometry => {
	const { resolution, radius, positions, colors } = input;
	const { cellSize, origin, size2, representatives, occupied } = prepareSurfaceGrid(input);
	const samples = new Float32Array(occupied.length * 3);
	const sampleColors = new Float32Array(samples.length);
	occupied.forEach((cell, i) => {
		const source = representatives[cell];
		for (let axis = 0; axis < 3; axis++) {
			samples[i * 3 + axis] = (positions[source + axis] - origin[axis]) / cellSize;
			sampleColors[i * 3 + axis] = colors ? linear(colors[source + axis]) : 0.7;
		}
	});
	const { normals, spacing } = estimateSurfaceNormals(samples);
	const maxTriangles = Math.max(250_000, Math.ceil(450_000 * (resolution / 128) ** 2));
	const material = new MeshStandardMaterial();
	const cubes = new MarchingCubes(resolution, material, false, true, maxTriangles);
	try {
		const weights = new Float32Array(size2 * resolution);
		// The representative grid is no longer needed; reuse its memory for color lookup.
		const nearestDistance = new Float32Array(representatives.buffer).fill(Infinity);
		for (let i = 0; i < occupied.length; i++) {
			const nx = normals[i * 3], ny = normals[i * 3 + 1], nz = normals[i * 3 + 2];
			if (Math.hypot(nx, ny, nz) < 0.5) continue;
			const x = samples[i * 3], y = samples[i * 3 + 1], z = samples[i * 3 + 2];
			// Respect sample spacing: increasing grid resolution must not turn a
			// previously connected sheet into isolated bubbles around its samples.
			const support = Math.min(10, Math.max(radius * 2, spacing[i] * 2));
			const supportSq = support * support;
			for (
				let gz = Math.max(1, Math.floor(z - support));
				gz <= Math.min(resolution - 2, Math.ceil(z + support));
				gz++
			) {
				for (
					let gy = Math.max(1, Math.floor(y - support));
					gy <= Math.min(resolution - 2, Math.ceil(y + support));
					gy++
				) {
					for (
						let gx = Math.max(1, Math.floor(x - support));
						gx <= Math.min(resolution - 2, Math.ceil(x + support));
						gx++
					) {
						const dx = gx - x, dy = gy - y, dz = gz - z;
						const distance = dx * dx + dy * dy + dz * dz;
						if (distance >= supportSq) continue;
						const index = gx + gy * resolution + gz * size2;
						const weight = (1 - distance / supportSq) ** 4;
						weights[index] += weight;
						cubes.field[index] -= weight * (dx * nx + dy * ny + dz * nz);
						cubes.normal_cache[index * 3] += weight * nx;
						cubes.normal_cache[index * 3 + 1] += weight * ny;
						cubes.normal_cache[index * 3 + 2] += weight * nz;
						if (distance < nearestDistance[index]) {
							nearestDistance[index] = distance;
							cubes.palette[index * 3] = sampleColors[i * 3];
							cubes.palette[index * 3 + 1] = sampleColors[i * 3 + 1];
							cubes.palette[index * 3 + 2] = sampleColors[i * 3 + 2];
						}
					}
				}
			}
		}
		for (let i = 0; i < weights.length; i++) {
			const length = Math.hypot(
				cubes.normal_cache[i * 3],
				cubes.normal_cache[i * 3 + 1],
				cubes.normal_cache[i * 3 + 2]
			);
			if (weights[i] < 1e-5 || length < weights[i] * 0.35) {
				weights[i] = 0;
				cubes.field[i] = -100;
				continue;
			}
			cubes.field[i] /= weights[i];
			for (let axis = 0; axis < 3; axis++) cubes.normal_cache[i * 3 + axis] /= length;
			// MarchingCubes uses zero in the X component as its "not computed" flag.
			if (cubes.normal_cache[i * 3] === 0) cubes.normal_cache[i * 3] = 1e-20;
		}
		cubes.isolation = 0;
		cubes.update();
		if (cubes.count > maxTriangles * 3) {
			throw new Error('面の数が上限を超えました。細かさを下げてください');
		}
		let length = 0;
		const corners = [
			0,
			1,
			resolution,
			resolution + 1,
			size2,
			size2 + 1,
			size2 + resolution,
			size2 + resolution + 1
		];
		for (let i = 0; i < cubes.count * 3; i += 9) {
			const gridCenter = [0, 1, 2].map((axis) =>
				Math.floor(
					((cubes.positionArray[i + axis] + cubes.positionArray[i + 3 + axis]
								+ cubes.positionArray[i + 6 + axis]) / 3 + 1) * resolution / 2
				)
			);
			const cell = gridCenter[0] + gridCenter[1] * resolution + gridCenter[2] * size2;
			// Reject the artificial zero crossings against unobserved space.
			if (corners.some((corner) => !weights[cell + corner])) continue;
			for (let vertex = 0; vertex < 9; vertex += 3) {
				const source = i + vertex;
				const destination = length + vertex;
				const x = (cubes.positionArray[source] + 1) * resolution / 2;
				const y = (cubes.positionArray[source + 1] + 1) * resolution / 2;
				const z = (cubes.positionArray[source + 2] + 1) * resolution / 2;
				cubes.positionArray[destination] = origin[0] + x * cellSize;
				cubes.positionArray[destination + 1] = origin[2] + z * cellSize;
				cubes.positionArray[destination + 2] = -(origin[1] + y * cellSize);
				const nx = cubes.normalArray[source],
					ny = cubes.normalArray[source + 1],
					nz = cubes.normalArray[source + 2];
				const normalLength = Math.hypot(nx, ny, nz) || 1;
				cubes.normalArray[destination] = nx / normalLength;
				cubes.normalArray[destination + 1] = nz / normalLength;
				cubes.normalArray[destination + 2] = -ny / normalLength;
				for (let axis = 0; axis < 3; axis++) {
					cubes.colorArray[destination + axis] = cubes.colorArray[source + axis];
				}
			}
			length += 9;
		}
		if (!length) {
			throw new Error(
				'表面を復元できませんでした。点が面状に分布する範囲を選ぶか、つながりの強さを上げてください'
			);
		}
		return {
			positions: cubes.positionArray.slice(0, length),
			normals: cubes.normalArray.slice(0, length),
			colors: cubes.colorArray.slice(0, length),
			cellSize,
			occupiedCells: occupied.length
		};
	} finally {
		cubes.geometry.dispose();
		material.dispose();
	}
};
