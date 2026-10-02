import earcut from 'earcut';
import { formatVtk } from './definition';
import { count, createArrayBudget } from './numeric';
import { QUADRATIC_FACES, QUADRATIC_PATCHES, QUADRATIC_SIZE } from './quadratic';
import type { VtkData, VtkSurface } from './types';

const VOLUME_FACES: Record<number, number[][]> = {
	10: [[0, 1, 2], [0, 3, 1], [1, 3, 2], [2, 3, 0]],
	11: [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]],
	12: [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]],
	13: [[0, 1, 2], [3, 5, 4], [0, 3, 4, 1], [1, 4, 5, 2], [2, 5, 3, 0]],
	14: [[0, 1, 2, 3], [0, 4, 1], [1, 4, 2], [2, 4, 3], [3, 4, 0]]
};
const EXACT_SIZE: Record<number, number> = {
	...QUADRATIC_SIZE,
	1: 1,
	3: 2,
	5: 3,
	8: 4,
	9: 4,
	10: 4,
	11: 8,
	12: 8,
	13: 6,
	14: 5
};
const MIN_SIZE: Record<number, number> = { 2: 1, 4: 2, 6: 3, 7: 3 };

/** Newell normal in a translated frame avoids cancellation for large projected coordinates. */
const normal = (ids: number[], points: Float64Array) => {
	const result = [0, 0, 0];
	const origin = ids[0] * 3;
	for (let i = 0; i < ids.length; i++) {
		const a = ids[i] * 3;
		const b = ids[(i + 1) % ids.length] * 3;
		for (let axis = 0; axis < 3; axis++) {
			const u = (axis + 1) % 3;
			const v = (axis + 2) % 3;
			result[axis] += (points[a + u] - points[b + u])
				* (points[a + v] + points[b + v] - 2 * points[origin + v]);
		}
	}
	return result;
};

const triangulate = (ids: number[], points: Float64Array): number[] => {
	if (ids.length === 3) return [0, 1, 2];
	const n = normal(ids, points);
	const drop = Math.abs(n[0]) > Math.abs(n[1])
		? (Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2)
		: (Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2);
	if (n[drop] === 0) throw new Error('VTK: 面積のないポリゴンがあります');
	const axes = [0, 1, 2].filter(axis => axis !== drop);
	const projected = ids.flatMap(id =>
		axes.map(axis => points[id * 3 + axis] - points[ids[0] * 3 + axis])
	);
	const indices = earcut(projected);
	if (indices.length !== (ids.length - 2) * 3) {
		throw new Error('VTK: ポリゴンを三角形に分割できませんでした');
	}
	// Preserve source winding; earcut chooses a winding in the projected plane.
	for (let i = 0; i < indices.length; i += 3) {
		const triNormal = normal(indices.slice(i, i + 3).map(index => ids[index]), points);
		if (triNormal.reduce((sum, value, axis) => sum + value * n[axis], 0) < 0) {
			[indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
		}
	}
	return indices;
};

export const extractVtkSurface = (data: VtkData): VtkSurface => {
	const { points, cells } = data;
	if (points.length % 3 || !points.length || points.some(value => !Number.isFinite(value))) {
		throw new Error('VTK: 座標には有限のXYZ値が必要です');
	}
	const pointCount = count(points.length / 3, '点数', formatVtk.limits.maxSourcePoints);
	count(cells.length, 'セル数', formatVtk.limits.maxFeatures);
	const pointIndices: number[] = [];
	const cellIndices: number[] = [];
	let ignoredCellCount = 0;
	const boundary = new Map<
		string,
		{ ids: number[]; cell: number; count: number; quadratic: boolean; }
	>();
	const generated: number[] = [];
	const interpolations: VtkSurface['interpolations'] = [];
	const volumeKeys = new Set<string>();
	const cornerFaces = new Map<string, string>();
	const budget = createArrayBudget();
	const addQuadraticFace = (ids: number[], cell: number, reverse = false) => {
		const patch = QUADRATIC_PATCHES.get(ids.length)!;
		count(
			pointIndices.length + patch.triangles.length,
			'描画頂点数',
			formatVtk.limits.maxVertices
		);
		const sampled = patch.weights.map(weights => {
			const node = weights.indexOf(1);
			if (node >= 0 && weights.every((value, i) => i === node || value === 0)) {
				return ids[node];
			}
			// Coordinates and interpolation records, including their final typed-array copy.
			budget(96);
			const id = pointCount + interpolations.length;
			interpolations.push({ ids, weights });
			for (let axis = 0; axis < 3; axis++) {
				const origin = points[ids[0] * 3 + axis];
				const value = origin
					+ weights.reduce(
						(sum, weight, i) => sum + weight * (points[ids[i] * 3 + axis] - origin),
						0
					);
				if (!Number.isFinite(value)) throw new Error('VTK: 補間座標が有限値ではありません');
				generated.push(value);
			}
			return id;
		});
		for (let i = 0; i < patch.triangles.length; i += 3) {
			const [a, b, c] = patch.triangles.slice(i, i + 3).map(index => sampled[index]);
			pointIndices.push(a, reverse ? c : b, reverse ? b : c);
			cellIndices.push(cell);
		}
	};
	const addFace = (ids: number[], cell: number) => {
		const triangles = triangulate(ids, points);
		count(pointIndices.length + triangles.length, '描画頂点数', formatVtk.limits.maxVertices);
		for (let i = 0; i < triangles.length; i += 3) {
			pointIndices.push(ids[triangles[i]], ids[triangles[i + 1]], ids[triangles[i + 2]]);
			cellIndices.push(cell);
		}
	};
	for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
		const { type, points: ids } = cells[cellIndex];
		if (!Object.hasOwn(EXACT_SIZE, type) && !Object.hasOwn(MIN_SIZE, type)) {
			throw new Error(
				`VTK: 未対応のセル型です (${type})。対応する線形・2次セルへ変換してください`
			);
		}
		if (
			(EXACT_SIZE[type] && ids.length !== EXACT_SIZE[type])
			|| ids.length < (MIN_SIZE[type] ?? 1)
		) {
			throw new Error(`VTK: セル型${type}の頂点数が不正です`);
		}
		count(ids.length, 'セルあたりの頂点数', 4096);
		for (const id of ids) count(id, '頂点参照', pointCount - 1);
		if (type <= 4 || type === 21) {
			ignoredCellCount++;
			continue;
		}
		if (type === 6) {
			for (let i = 0; i < ids.length - 2; i++) {
				const tri = i % 2 ? [ids[i + 1], ids[i], ids[i + 2]] : ids.slice(i, i + 3);
				if (new Set(tri).size === 3) addFace(tri, cellIndex);
			}
		} else if ([22, 23, 28].includes(type)) {
			addQuadraticFace(ids, cellIndex);
		} else if (type < 10) {
			addFace(type === 8 ? [ids[0], ids[1], ids[3], ids[2]] : ids, cellIndex);
		} else {
			if (new Set(ids).size !== ids.length) {
				throw new Error('VTK: 体積セルに重複した頂点参照があります');
			}
			const volumeKey = ids.map(id => data.topologyIds?.[id] ?? id).sort((a, b) => a - b)
				.join(',');
			if (volumeKeys.has(volumeKey)) throw new Error('VTK: 重複した体積セルがあります');
			volumeKeys.add(volumeKey);
			for (const face of (QUADRATIC_FACES[type] ?? VOLUME_FACES[type])) {
				const faceIds = face.map(index => ids[index]);
				const key = faceIds.map(id => data.topologyIds?.[id] ?? id).sort((a, b) => a - b)
					.join(',');
				const corners = QUADRATIC_FACES[type]
					? faceIds.slice(0, faceIds.length === 6 ? 3 : 4)
					: faceIds;
				const cornerKey = corners.map(id => data.topologyIds?.[id] ?? id).sort((a, b) =>
					a - b
				).join(',');
				const matched = cornerFaces.get(cornerKey);
				if (matched !== undefined && matched !== key) {
					throw new Error('VTK: 共有面の次数または中間節点が一致しません');
				}
				cornerFaces.set(cornerKey, key);
				const existing = boundary.get(key);
				if (existing) {
					if (++existing.count > 2) {
						throw new Error('VTK: 3つ以上のセルが同じ面を共有しています');
					}
				} else {
					count(boundary.size + 1, '体積セルの面数', formatVtk.limits.maxVertices / 3);
					boundary.set(key, {
						ids: faceIds,
						cell: cellIndex,
						count: 1,
						quadratic: !!QUADRATIC_FACES[type]
					});
				}
			}
		}
	}
	for (const face of boundary.values()) {
		if (face.count !== 1) continue;
		const corners = face.quadratic
			? face.ids.slice(0, face.ids.length === 6 ? 3 : 4)
			: face.ids;
		const n = normal(corners, points);
		const ids = cells[face.cell].points;
		const origin = face.ids[0] * 3;
		// Orient outward using the source cell's centroid.
		const direction = [0, 1, 2].map(axis =>
			-ids.reduce((sum, id) => sum + (points[id * 3 + axis] - points[origin + axis]), 0)
			/ ids.length
		);
		const reverse = n.reduce((sum, value, axis) => sum + value * direction[axis], 0) < 0;
		if (face.quadratic) {
			addQuadraticFace(face.ids, face.cell, reverse);
			continue;
		}
		if (reverse) {
			face.ids.reverse();
		}
		addFace(face.ids, face.cell);
	}
	if (!cellIndices.length) {
		throw new Error('VTK: 表示できる面がありません。点・線のみのデータは対象外です');
	}
	let surfacePoints = points;
	if (generated.length) {
		budget(points.byteLength);
		surfacePoints = new Float64Array(points.length + generated.length);
		surfacePoints.set(points);
		surfacePoints.set(generated, points.length);
	}
	return {
		points: surfacePoints,
		interpolations,
		pointIndices: Uint32Array.from(pointIndices),
		cellIndices: Uint32Array.from(cellIndices),
		ignoredCellCount
	};
};
