export interface SurfaceCoordinateInput {
	positions: Float32Array;
	bounds: [number, number, number, number];
	coordinateOrigin?: [number, number, number];
}

const EARTH_CIRCUMFERENCE = 40075016.68557849;
const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));

/** Keep metres and the geographic anchor separate throughout surface reconstruction. */
export const localizeSurfacePoints = (
	{ positions, bounds, coordinateOrigin }: SurfaceCoordinateInput
) => {
	const lng = coordinateOrigin?.[0] ?? (bounds[0] + bounds[2]) / 2;
	const lat = coordinateOrigin?.[1] ?? (bounds[1] + bounds[3]) / 2;
	if (
		!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180
		|| Math.abs(lat) > 85.051129
	) {
		throw new Error('点群の配置座標が不正です');
	}
	const local = new Float32Array(positions.length);
	const metresPerRadian = EARTH_CIRCUMFERENCE * Math.cos(lat * Math.PI / 180) / (2 * Math.PI);
	const originY = mercatorY(lat);
	for (let i = 0; i < positions.length; i += 3) {
		if (coordinateOrigin) {
			local[i] = positions[i];
			local[i + 1] = positions[i + 1];
			local[i + 2] = positions[i + 2] + coordinateOrigin[2];
		} else {
			const pointLng = positions[i], pointLat = positions[i + 1];
			if (Math.abs(pointLng) > 180 || Math.abs(pointLat) > 85.051129) {
				throw new Error('メッシュを作る前に点群の座標系を設定してください');
			}
			local[i] = (pointLng - lng) * Math.PI / 180 * metresPerRadian;
			local[i + 1] = (mercatorY(pointLat) - originY) * metresPerRadian;
			local[i + 2] = positions[i + 2];
		}
	}
	return { positions: local, lng, lat };
};
