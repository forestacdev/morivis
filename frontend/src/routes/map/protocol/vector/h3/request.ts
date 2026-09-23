import { H3_LEVELS } from '$routes/map/utils/mesh/h3-levels';

export interface H3Tile {
	resolution: number;
	z: number;
	x: number;
	y: number;
}

export const parseH3TileUrl = (url: string): H3Tile => {
	const match = /^h3_grid:\/\/tile\/(\d+)\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(url);
	if (!match) throw new Error('Invalid H3 tile URL');
	const [resolution, z, x, y] = match.slice(1).map(Number);
	const config = H3_LEVELS[resolution];
	if (
		!config || z < config.minzoom || z >= config.maxzoom
		|| !Number.isSafeInteger(x) || !Number.isSafeInteger(y)
		|| x >= 2 ** z || y >= 2 ** z
	) throw new Error('Invalid H3 tile coordinates');
	return { resolution, z, x, y };
};
