import { REGIONAL_MESH_LEVELS, type RegionalMeshLevel } from '$routes/map/utils/mesh/regional-mesh';

export interface RegionalMeshTile {
	level: RegionalMeshLevel;
	z: number;
	x: number;
	y: number;
}

export const parseRegionalMeshTileUrl = (url: string): RegionalMeshTile => {
	const match = /^regional_mesh:\/\/tile\/([1-6])\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(url);
	if (!match) throw new Error('Invalid regional mesh tile URL');
	const [level, z, x, y] = match.slice(1).map(Number);
	const config = REGIONAL_MESH_LEVELS[level - 1];
	if (
		z < config.minzoom || z > Math.min(config.maxzoom - 1, 16)
		|| !Number.isSafeInteger(x) || !Number.isSafeInteger(y)
		|| x >= 2 ** z || y >= 2 ** z
	) throw new Error('Invalid regional mesh tile coordinates');
	return { level: level as RegionalMeshLevel, z, x, y };
};
