import { S2_LEVELS } from '$routes/map/utils/mesh/s2-levels';

export interface S2Tile {
	level: number;
	z: number;
	x: number;
	y: number;
}

export const parseS2TileUrl = (url: string): S2Tile => {
	const match = /^s2_grid:\/\/tile\/(\d+)\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(url);
	if (!match) throw new Error('Invalid S2 tile URL');
	const [level, z, x, y] = match.slice(1).map(Number);
	const config = S2_LEVELS[level];
	if (
		!config || z < config.minzoom || z >= config.maxzoom
		|| !Number.isSafeInteger(x) || !Number.isSafeInteger(y)
		|| x >= 2 ** z || y >= 2 ** z
	) throw new Error('Invalid S2 tile coordinates');
	return { level, z, x, y };
};
