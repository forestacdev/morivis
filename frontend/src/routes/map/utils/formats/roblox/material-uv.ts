import type { RobloxVector } from './world';

/** Robloxの面方向に合わせ、ローカル位置をstud単位の繰り返しUVにする。 */
export const materialUv = (
	position: RobloxVector,
	normal: RobloxVector,
	size: RobloxVector,
	tile: number
): [number, number] => {
	const [x, y, z] = position;
	const [nx, ny, nz] = normal;
	if (Math.abs(nx) >= Math.abs(ny) && Math.abs(nx) >= Math.abs(nz)) {
		return [((nx > 0 ? -z : z) + 0.5) * size[2] / tile, (0.5 - y) * size[1] / tile];
	}
	if (Math.abs(ny) >= Math.abs(nz)) {
		return [(x + 0.5) * size[0] / tile, ((ny > 0 ? z : -z) + 0.5) * size[2] / tile];
	}
	return [((nz > 0 ? x : -x) + 0.5) * size[0] / tile, (0.5 - y) * size[1] / tile];
};
