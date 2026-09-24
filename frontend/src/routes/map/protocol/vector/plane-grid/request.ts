import { PLANE_GRID_LEVELS } from '$routes/map/utils/mesh/plane-grid-config';

export interface PlaneGridTile {
	zone: number;
	spacing: number;
	z: number;
	x: number;
	y: number;
}

export const parsePlaneGridTileUrl = (url: string): PlaneGridTile => {
	const match = /^plane_grid:\/\/tile\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(url);
	if (!match) throw new Error('Invalid plane grid tile URL');
	const [zone, spacing, z, x, y] = match.slice(1).map(Number);
	const config = PLANE_GRID_LEVELS.find(level => level.spacing === spacing);
	if (
		zone < 1 || zone > 19 || !config || z < config.minzoom
		|| z > Math.min(config.maxzoom - 1, 20)
		|| !Number.isSafeInteger(x) || !Number.isSafeInteger(y) || x >= 2 ** z || y >= 2 ** z
	) {
		throw new Error('Invalid plane grid tile coordinates');
	}
	return { zone, spacing, z, x, y };
};
