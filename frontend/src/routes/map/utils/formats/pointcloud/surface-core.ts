export interface PointCloudSurfaceOptions {
	method?: 'terrain' | 'buildings' | 'reconstruct';
	/** Detail level; terrain/buildings use four times this many cells on the longest axis. */
	resolution: number;
	/** Neighborhood support setting in grid cells (unused for terrain). */
	radius: number;
}

export interface PointCloudSurfaceInput extends PointCloudSurfaceOptions {
	/** Local coordinates, in metres: east, north, up. */
	positions: Float32Array;
	/** Packed sRGB, three channels per point. */
	colors?: Uint8Array;
}

export interface PointCloudSurfaceGeometry {
	/** glTF axes: east, up, south. */
	positions: Float32Array;
	normals: Float32Array;
	/** Linear RGB. */
	colors: Float32Array;
	cellSize: number;
	occupiedCells: number;
}

const MAX_OCCUPIED_CELLS = 200_000;
/** Select one representative per voxel in a bounded, local metric grid. */
export const prepareSurfaceGrid = ({
	positions,
	colors,
	resolution,
	radius
}: PointCloudSurfaceInput) => {
	if (!Number.isInteger(resolution) || resolution < 32 || resolution > 192) {
		throw new Error('メッシュの細かさは 32〜192 で指定してください');
	}
	if (!Number.isFinite(radius) || radius < 1 || radius > 3) {
		throw new Error('つながりの強さは 1〜3 で指定してください');
	}
	if (positions.length < 9 || positions.length % 3 !== 0) {
		throw new Error('メッシュの生成には 3 点以上の XYZ が必要です');
	}
	if (colors && colors.length !== positions.length) {
		throw new Error('点群の RGB と座標の数が一致しません');
	}
	const min = [Infinity, Infinity, Infinity];
	const max = [-Infinity, -Infinity, -Infinity];
	let validCount = 0;
	for (let i = 0; i < positions.length; i += 3) {
		if (![positions[i], positions[i + 1], positions[i + 2]].every(Number.isFinite)) continue;
		validCount++;
		for (let axis = 0; axis < 3; axis++) {
			min[axis] = Math.min(min[axis], positions[i + axis]);
			max[axis] = Math.max(max[axis], positions[i + axis]);
		}
	}
	const span = Math.max(...max.map((value, axis) => value - min[axis]));
	if (validCount < 3 || !Number.isFinite(span) || span <= 0) {
		throw new Error('広がりのある有効な点群が必要です');
	}
	// Leave padding for local distance estimation and MarchingCubes' boundary stencil.
	const padding = Math.ceil(radius) + 4;
	const cellSize = span / (resolution - 1 - padding * 2);
	const origin = min.map((value, axis) => (value + max[axis]) / 2 - cellSize * resolution / 2);
	const size2 = resolution * resolution;
	const representatives = new Int32Array(size2 * resolution).fill(-1);
	const occupied: number[] = [];
	for (let i = 0; i < positions.length; i += 3) {
		const x = (positions[i] - origin[0]) / cellSize;
		const y = (positions[i + 1] - origin[1]) / cellSize;
		const z = (positions[i + 2] - origin[2]) / cellSize;
		if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
		const gx = Math.round(x), gy = Math.round(y), gz = Math.round(z);
		const index = gx + gy * resolution + gz * size2;
		const previous = representatives[index];
		if (previous === -1) {
			occupied.push(index);
			if (occupied.length > MAX_OCCUPIED_CELLS) {
				throw new Error(
					'点群が広範囲に分布しています。細かさを下げるか、範囲を分けてください'
				);
			}
		} else {
			const distance = (x - gx) ** 2 + (y - gy) ** 2 + (z - gz) ** 2;
			const previousDistance = ((positions[previous] - origin[0]) / cellSize - gx) ** 2
				+ ((positions[previous + 1] - origin[1]) / cellSize - gy) ** 2
				+ ((positions[previous + 2] - origin[2]) / cellSize - gz) ** 2;
			if (distance >= previousDistance) continue;
		}
		representatives[index] = i;
	}
	return { cellSize, origin, size2, representatives, occupied };
};
