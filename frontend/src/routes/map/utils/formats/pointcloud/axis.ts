import type { PointCloudSourcePositions } from './coordinate-offsets';

export type PointCloudUpAxis = 'y-up' | 'z-up';

/** 点群を地図で使う Z-up 座標へ正規化する。 */
export const normalizePointCloudUpAxis = (
	positions: PointCloudSourcePositions,
	upAxis: PointCloudUpAxis
): Float32Array => {
	if (upAxis === 'z-up') {
		return positions instanceof Float32Array ? positions : new Float32Array(positions);
	}

	const normalized = new Float32Array(positions.length);
	for (let offset = 0; offset + 2 < positions.length; offset += 3) {
		// Keep the source's right-handed coordinate system while making Y vertical.
		normalized[offset] = positions[offset];
		normalized[offset + 1] = -positions[offset + 2];
		normalized[offset + 2] = positions[offset + 1];
	}

	return normalized;
};

export const getPointCloudBbox = (
	positions: ArrayLike<number>
): [number, number, number, number] | null => {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (let offset = 0; offset + 2 < positions.length; offset += 3) {
		const x = positions[offset];
		const y = positions[offset + 1];
		if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
	}

	return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
};
