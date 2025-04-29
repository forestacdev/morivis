/**
 * 経度・緯度 → タイル座標 (z/x/y) に変換
 * @param lon 経度（-180 〜 180）
 * @param lat 緯度（-85 〜 85）
 * @param zoom ズームレベル（デフォルト 14）
 * @returns タイル座標 { x, y, z }
 */
export const lonLatToTileCoords = (
	lon: number,
	lat: number,
	zoom: number = 14
): { x: number; y: number; z: number } => {
	const latRad = (lat * Math.PI) / 180;
	const n = Math.pow(2, zoom);

	const x = Math.floor(((lon + 180) / 360) * n);
	const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);

	return { x, y, z: zoom };
};
