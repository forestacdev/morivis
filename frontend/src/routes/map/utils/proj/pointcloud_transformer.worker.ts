import proj4 from 'proj4';

interface WorkerMessageData {
	positions: Float32Array;
	prjContent: string;
}

/**
 * 点群のXY座標を一括で変換する
 * positions: [x0, y0, z0, x1, y1, z1, ...] のFloat32Array
 * 変換後: [lng0, lat0, z0, lng1, lat1, z1, ...]
 */
onmessage = (event: MessageEvent<WorkerMessageData>) => {
	const { positions, prjContent } = event.data;

	try {
		const count = positions.length / 3;
		const result = new Float32Array(positions.length);

		for (let i = 0; i < count; i++) {
			const idx = i * 3;
			const [lng, lat] = proj4(prjContent, 'EPSG:4326', [positions[idx], positions[idx + 1]]);
			result[idx] = lng;
			result[idx + 1] = lat;
			result[idx + 2] = positions[idx + 2]; // Zはそのまま
		}

		postMessage({ type: 'TRANSFORMED', positions: result }, { transfer: [result.buffer] });
	} catch (error) {
		postMessage({
			type: 'ERROR',
			error: error instanceof Error ? error.message : String(error)
		});
	}
};
