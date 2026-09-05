export type PointCloudSourcePositions = Float32Array | Float64Array;

export interface PointCloudMeterOffsets {
	positions: Float32Array;
	coordinateOrigin: [number, number, number];
}

/** 投影座標の点群を、Deck の地理座標原点からのメートル差分へ変換する。 */
export const createPointCloudMeterOffsets = (
	positions: PointCloudSourcePositions,
	projectedOrigin: [number, number],
	coordinateOrigin: [number, number, number]
): PointCloudMeterOffsets => {
	const offsets = new Float32Array(positions.length);

	for (let index = 0; index < positions.length; index += 3) {
		offsets[index] = positions[index] - projectedOrigin[0];
		offsets[index + 1] = positions[index + 1] - projectedOrigin[1];
		offsets[index + 2] = positions[index + 2] - coordinateOrigin[2];
	}

	return { positions: offsets, coordinateOrigin };
};
