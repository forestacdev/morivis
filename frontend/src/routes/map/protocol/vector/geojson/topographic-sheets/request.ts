import { TOPOGRAPHIC_SHEET_SCALES, type SheetScale } from './config';

export interface TopographicSheetTile {
	scale: SheetScale;
	z: number;
	x: number;
	y: number;
}

export const parseTopographicSheetTileUrl = (url: string): TopographicSheetTile => {
	const match = /^https?:\/\/[^/]+\/xyz\/zk(\d+)\/(\d+)\/(\d+)\/(\d+)\.geojson$/.exec(url);
	if (!match) throw new Error('Invalid topographic sheet tile URL');
	const [scale, z, x, y] = match.slice(1).map(Number);
	const config = TOPOGRAPHIC_SHEET_SCALES.find(item => item.scale === scale);
	if (!config || z < config.minzoom || z > config.tileMaxZoom
		|| !Number.isSafeInteger(x) || !Number.isSafeInteger(y)
		|| x >= 2 ** z || y >= 2 ** z) {
		throw new Error('Invalid topographic sheet tile coordinates');
	}
	return { scale: config.scale, z, x, y };
};

export const getNativeSheetTiles = ({ scale, z, x, y }: TopographicSheetTile) => {
	const config = TOPOGRAPHIC_SHEET_SCALES.find(item => item.scale === scale)!;
	const nativeZ = Math.min(z, config.nativeZoom);
	const factor = 2 ** (z - nativeZ);
	const nativeX = Math.floor(x / factor);
	const nativeY = Math.floor(y / factor);
	const count = 2 ** nativeZ;
	// 図名の点が隣のタイルに属していても、表示範囲に入る図郭の辺を取得する。
	const urls: string[] = [];
	for (let dy = -1; dy <= 1; dy++) {
		const ty = nativeY + dy;
		if (ty < 0 || ty >= count) continue;
		for (let dx = -1; dx <= 1; dx++) {
			const tx = (nativeX + dx + count) % count;
			urls.push(`https://maps.gsi.go.jp/xyz/zk${scale}/${nativeZ}/${tx}/${ty}.geojson`);
		}
	}
	return { key: `${scale}/${nativeZ}/${nativeX}/${nativeY}`, urls };
};
