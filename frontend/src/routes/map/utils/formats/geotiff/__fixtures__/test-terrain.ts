/** 地図・モデルビュー間の向きを検証する架空の非対称な山。 */
export const testTerrain = {
	width: 3,
	height: 3,
	band: new Float32Array([1, 2, 3, 4, 12, 5, 6, 7, 8]),
	bounds: [0, 0, 0.002, 0.002] as [number, number, number, number],
	nodata: null
};
