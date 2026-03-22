import TransformerWorker from './pointcloud_transformer.worker?worker';

const MIN_CHUNK_POINTS = 10000;

/**
 * 点群のXY座標を並列ワーカーで一括変換する
 * positions: [x0, y0, z0, x1, y1, z1, ...] のFloat32Array
 */
export const transformPointCloudParallel = (
	positions: Float32Array,
	prjContent: string
): Promise<Float32Array> => {
	const count = positions.length / 3;
	const numWorkers = Math.max(
		1,
		Math.min(navigator.hardwareConcurrency ?? 4, Math.ceil(count / MIN_CHUNK_POINTS), 4)
	);

	return new Promise((resolve, reject) => {
		const chunkSize = Math.ceil(count / numWorkers);
		const result = new Float32Array(positions.length);
		const workers: Worker[] = [];
		let completed = 0;
		let rejected = false;

		const cleanup = () => {
			workers.forEach((w) => w.terminate());
		};

		for (let i = 0; i < numWorkers; i++) {
			const startIdx = i * chunkSize * 3;
			const endIdx = Math.min((i + 1) * chunkSize * 3, positions.length);
			const chunk = positions.slice(startIdx, endIdx);
			const offset = startIdx;

			const worker = new TransformerWorker();
			workers.push(worker);

			worker.onmessage = (e) => {
				if (rejected) return;
				if (e.data.type === 'TRANSFORMED') {
					result.set(e.data.positions, offset);
					completed++;
					if (completed === numWorkers) {
						cleanup();
						resolve(result);
					}
				} else if (e.data.type === 'ERROR') {
					rejected = true;
					cleanup();
					reject(new Error(e.data.error));
				}
			};

			worker.onerror = (e) => {
				if (rejected) return;
				rejected = true;
				cleanup();
				reject(new Error(e.message));
			};

			worker.postMessage({ positions: chunk, prjContent }, [chunk.buffer]);
		}
	});
};
