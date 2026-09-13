import { edgeTable as edges, triTable as triangles } from 'three/addons/objects/MarchingCubes.js';

import type { PointCloudSurfaceInput } from './surface-core';
import { estimateSurfaceNormals } from './surface-normals';

// The installed @types/three declares arrays of arrays, but Three exports flat Int32Arrays.
const edgeTable = edges as unknown as Int32Array;
const triTable = triangles as unknown as Int32Array;

export interface SurfaceChunk {
	positions: Float32Array;
	normals: Float32Array;
	colors: Float32Array;
	indices: Uint32Array;
}

const MAX_SAMPLES = 1_200_000;
const MAX_TRIANGLES = 5_000_000;
const SUPPORT_LIMIT = 6;
const CORNERS = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [
	0,
	1,
	1
]];
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [
	2,
	6
], [3, 7]];
const linear = (v: number) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

/**
 * One globally sampled/oriented cloud, processed on a shared lattice in small blocks.
 * Blocks own disjoint cells and share identically evaluated boundary nodes.
 * Returned chunks are mesh primitives in ONE GLB, not a 3D Tiles dataset.
 */
export const reconstructSurfaceChunks = (
	input: PointCloudSurfaceInput,
	progress: (message: string) => void = () => {},
	/** Internal test seam: changing block size must not change the surface. */
	blockCells = 48
) => {
	const { positions, colors, resolution, radius } = input;
	if (!Number.isInteger(resolution) || resolution < 32 || resolution > 192) {
		throw new Error('メッシュの細かさは 32〜192 で指定してください');
	}
	if (!Number.isFinite(radius) || radius < 1 || radius > 3) {
		throw new Error('つながりの強さは 1〜3 で指定してください');
	}
	if (
		positions.length < 9 || positions.length % 3
		|| (colors && colors.length !== positions.length)
	) throw new Error('点群の座標とRGBの数を確認してください');
	if (!Number.isInteger(blockCells) || blockCells < 8 || blockCells > 64) {
		throw new Error('区画サイズが不正です');
	}
	const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
	let valid = 0;
	for (let i = 0; i < positions.length; i += 3) {
		if (
			!Number.isFinite(positions[i]) || !Number.isFinite(positions[i + 1])
			|| !Number.isFinite(positions[i + 2])
		) continue;
		valid++;
		for (let a = 0; a < 3; a++) {
			min[a] = Math.min(min[a], positions[i + a]);
			max[a] = Math.max(max[a], positions[i + a]);
		}
	}
	const span = Math.max(...max.map((v, a) => v - min[a]));
	if (valid < 3 || !Number.isFinite(span) || span <= 0) {
		throw new Error('広がりのある有効な点群が必要です');
	}
	const cellSize = span / (resolution * 4);
	const origin = min.map(v => v - (SUPPORT_LIMIT + 2) * cellSize);
	const dimensions = max.map((v, a) => Math.ceil((v - origin[a]) / cellSize) + SUPPORT_LIMIT + 3);
	progress('点群を整理しています');
	const representatives = new Map<number, number>();
	for (let i = 0; i < positions.length; i += 3) {
		const x = (positions[i] - origin[0]) / cellSize,
			y = (positions[i + 1] - origin[1]) / cellSize,
			z = (positions[i + 2] - origin[2]) / cellSize;
		if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
		const gx = Math.round(x), gy = Math.round(y), gz = Math.round(z);
		const key = gx + dimensions[0] * (gy + dimensions[1] * gz);
		const previous = representatives.get(key);
		if (previous !== undefined) {
			const distance = (x - gx) ** 2 + (y - gy) ** 2 + (z - gz) ** 2;
			const previousDistance = ((positions[previous] - origin[0]) / cellSize - gx) ** 2
				+ ((positions[previous + 1] - origin[1]) / cellSize - gy) ** 2
				+ ((positions[previous + 2] - origin[2]) / cellSize - gz) ** 2;
			if (distance >= previousDistance) continue;
		}
		representatives.set(key, i);
		if (representatives.size > MAX_SAMPLES) {
			throw new Error(
				'点群が細かすぎます。「細かさ」を下げるか、対象範囲を絞ってください（代表点120万点が上限です）'
			);
		}
	}
	const count = representatives.size;
	const samples = new Float32Array(count * 3), sampleColors = new Float32Array(count * 3);
	let sample = 0;
	for (const i of representatives.values()) {
		for (let a = 0; a < 3; a++) {
			samples[sample * 3 + a] = (positions[i + a] - origin[a]) / cellSize;
			sampleColors[sample * 3 + a] = colors ? linear(colors[i + a] / 255) : 0.7;
		}
		sample++;
	}
	representatives.clear();
	progress(`面の向きを推定しています（${count.toLocaleString()}点）`);
	const { normals, spacing } = estimateSurfaceNormals(samples, true);
	const blockDimensions = dimensions.map(v => Math.ceil((v - 1) / blockCells));
	const blocks = new Map<number, number[]>();
	const supports = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		if (Math.hypot(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]) < 0.5) continue;
		const support = Math.min(SUPPORT_LIMIT, Math.max(radius * 1.5, spacing[i] * 2));
		supports[i] = support;
		const lo = [0, 1, 2].map(a =>
			Math.max(0, Math.floor((samples[i * 3 + a] - support) / blockCells))
		);
		const hi = [0, 1, 2].map(a =>
			Math.min(
				blockDimensions[a] - 1,
				Math.floor((samples[i * 3 + a] + support) / blockCells)
			)
		);
		for (let z = lo[2]; z <= hi[2]; z++) {
			for (let y = lo[1]; y <= hi[1]; y++) {
				for (let x = lo[0]; x <= hi[0]; x++) {
					const key = x + blockDimensions[0] * (y + blockDimensions[1] * z);
					let list = blocks.get(key);
					if (!list) {
						list = [];
						blocks.set(key, list);
					}
					list.push(i);
				}
			}
		}
	}
	const chunks: SurfaceChunk[] = [];
	let triangleCount = 0, completed = 0;
	const n = blockCells + 1, n2 = n * n, n3 = n2 * n;
	// Reuse the working volume for every block. Resolution increases block count,
	// never the cubic memory allocation for a single block.
	const field = new Float32Array(n3),
		weights = new Float32Array(n3),
		nodeNormals = new Float32Array(n3 * 3),
		palette = new Float32Array(n3 * 3),
		nearest = new Float32Array(n3);
	const reference = new Int32Array(n3);
	for (const [key, ids] of blocks) {
		const bx = key % blockDimensions[0],
			by = Math.floor(key / blockDimensions[0]) % blockDimensions[1],
			bz = Math.floor(key / (blockDimensions[0] * blockDimensions[1]));
		const start = [bx * blockCells, by * blockCells, bz * blockCells];
		field.fill(0);
		weights.fill(0);
		nodeNormals.fill(0);
		nearest.fill(Infinity);
		reference.fill(-1);
		const visit = (
			id: number,
			callback: (index: number, dx: number, dy: number, dz: number, d2: number) => void
		) => {
			// Work in GLOBAL grid coordinates to give both sides of a seam exactly
			// the same floating-point arithmetic and summation order.
			const x = samples[id * 3],
				y = samples[id * 3 + 1],
				z = samples[id * 3 + 2],
				s = supports[id];
			for (
				let gz = Math.max(start[2], Math.ceil(z - s));
				gz <= Math.min(start[2] + blockCells, Math.floor(z + s));
				gz++
			) {
				for (
					let gy = Math.max(start[1], Math.ceil(y - s));
					gy <= Math.min(start[1] + blockCells, Math.floor(y + s));
					gy++
				) {
					for (
						let gx = Math.max(start[0], Math.ceil(x - s));
						gx <= Math.min(start[0] + blockCells, Math.floor(x + s));
						gx++
					) {
						const dx = gx - x,
							dy = gy - y,
							dz = gz - z,
							d2 = dx * dx + dy * dy + dz * dz;
						if (d2 >= s * s) continue;
						callback(
							gx - start[0] + n * (gy - start[1]) + n2 * (gz - start[2]),
							dx,
							dy,
							dz,
							d2
						);
					}
				}
			}
		};
		for (const id of ids) {
			visit(id, (index, _dx, _dy, _dz, d2) => {
				if (d2 < nearest[index]) {
					nearest[index] = d2;
					reference[index] = id;
				}
			});
		}
		for (const id of ids) {
			visit(id, (index, dx, dy, dz, d2) => {
				const ref = reference[index];
				const dot = normals[id * 3] * normals[ref * 3]
					+ normals[id * 3 + 1] * normals[ref * 3 + 1]
					+ normals[id * 3 + 2] * normals[ref * 3 + 2];
				// Avoid averaging a roof with the perpendicular wall at a building edge.
				if (dot < 0.75) return;
				const weight = (1 - d2 / (supports[id] * supports[id])) ** 4;
				weights[index] += weight;
				field[index] += weight
					* (dx * normals[id * 3] + dy * normals[id * 3 + 1] + dz * normals[id * 3 + 2]);
				for (let a = 0; a < 3; a++) {
					nodeNormals[index * 3 + a] += weight * normals[id * 3 + a];
				}
			});
		}
		for (let i = 0; i < n3; i++) {
			if (weights[i] < 1e-5) {
				weights[i] = 0;
				continue;
			}
			field[i] /= weights[i];
			const length = Math.hypot(
				nodeNormals[i * 3],
				nodeNormals[i * 3 + 1],
				nodeNormals[i * 3 + 2]
			);
			for (let a = 0; a < 3; a++) {
				nodeNormals[i * 3 + a] /= length;
				palette[i * 3 + a] = sampleColors[reference[i] * 3 + a];
			}
		}
		const vertices: number[] = [],
			vertexNormals: number[] = [],
			vertexColors: number[] = [],
			indices: number[] = [];
		const edgeVertices = new Map<number, number>();
		const cornerIndices = new Int32Array(8), vertexIds = new Int32Array(12);
		for (let z = 0; z < blockCells; z++) {
			for (let y = 0; y < blockCells; y++) {
				for (let x = 0; x < blockCells; x++) {
					let cube = 0, supported = true;
					for (let c = 0; c < 8; c++) {
						const [cx, cy, cz] = CORNERS[c],
							index = x + cx + n * (y + cy) + n2 * (z + cz);
						cornerIndices[c] = index;
						if (!weights[index]) {
							supported = false;
							break;
						}
						if (field[index] < 0) cube |= 1 << c;
					}
					if (!supported || !edgeTable[cube]) {
						continue;
					}
					for (let e = 0; e < 12; e++) {
						if (!(edgeTable[cube] & (1 << e))) continue;
						let [a, b] = EDGES[e];
						// Canonical low-to-high edge direction also holds at block boundaries.
						if (cornerIndices[a] > cornerIndices[b]) [a, b] = [b, a];
						const ia = cornerIndices[a], ib = cornerIndices[b], delta = ib - ia;
						const edgeKey = ia * 3 + (delta === 1 ? 0 : delta === n ? 1 : 2);
						let vertex = edgeVertices.get(edgeKey);
						if (vertex === undefined) {
							vertex = vertices.length / 3;
							edgeVertices.set(edgeKey, vertex);
							const t = field[ia] / (field[ia] - field[ib]);
							const point = [0, 1, 2].map(axis =>
								origin[axis]
								+ (start[axis] + [x, y, z][axis] + CORNERS[a][axis]
										+ t * (CORNERS[b][axis] - CORNERS[a][axis])) * cellSize
							);
							vertices.push(point[0], point[2], -point[1]);
							const normal = [0, 1, 2].map(axis =>
								nodeNormals[ia * 3 + axis] * (1 - t)
								+ nodeNormals[ib * 3 + axis] * t
							);
							const length = Math.hypot(...normal) || 1;
							vertexNormals.push(
								normal[0] / length,
								normal[2] / length,
								-normal[1] / length
							);
							for (let axis = 0; axis < 3; axis++) {
								vertexColors.push(
									palette[ia * 3 + axis] * (1 - t) + palette[ib * 3 + axis] * t
								);
							}
						}
						vertexIds[e] = vertex;
					}
					for (let t = cube * 16; triTable[t] !== -1; t += 3) {
						// The lookup table points towards negative field values. Reverse it for
						// outward signed-distance normals (ENU -> glTF preserves handedness).
						indices.push(
							vertexIds[triTable[t]],
							vertexIds[triTable[t + 2]],
							vertexIds[triTable[t + 1]]
						);
						if (++triangleCount > MAX_TRIANGLES) {
							throw new Error(
								'面数が500万面を超えました。「細かさ」を下げてください'
							);
						}
					}
				}
			}
		}
		if (indices.length) {
			chunks.push({
				positions: new Float32Array(vertices),
				normals: new Float32Array(vertexNormals),
				colors: new Float32Array(vertexColors),
				indices: new Uint32Array(indices)
			});
		}
		progress(`面を生成しています（${++completed}/${blocks.size}区画）`);
	}
	if (!triangleCount) {
		throw new Error('表面を復元できませんでした。点が面状に分布する範囲を選んでください');
	}
	return { chunks, cellSize, triangleCount, occupiedCells: count };
};
