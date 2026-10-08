/** MapLibreの世界をまたぐ経度を、CSWのCRS84範囲へ正規化する。 */
export const normalizeCswMapBounds = (
	[west, south, east, north]: [number, number, number, number]
): [number, number, number, number] => {
	const latitude = (value: number) => Math.max(-90, Math.min(90, value));
	const longitude = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;
	if (east - west >= 360) return [-180, latitude(south), 180, latitude(north)];
	return [longitude(west), latitude(south), longitude(east), latitude(north)];
};
