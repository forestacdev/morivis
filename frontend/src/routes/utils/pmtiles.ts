import { PMTiles } from 'pmtiles';

/** PMTiles から .pbf を取得 */
export const getVectorTilePmtiles = async (
	url: string,
	tile: { x: number; y: number; z: number }
): Promise<Uint8Array> => {
	const pmtiles = new PMTiles(url);

	const tileData = await pmtiles.getZxy(tile.z, tile.x, tile.y);
	if (!tileData || !tileData.data) {
		throw new Error('Vector tile data not found');
	}

	// tileData.data は Uint8Array（または ArrayBuffer）として返ってくる
	return tileData.data; // このままベクタータイルデータとして利用
};
