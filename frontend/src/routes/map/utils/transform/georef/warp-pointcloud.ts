import WarpPointCloudWorker from './warp-pointcloud.worker?worker';

import type { GeoRefCorners } from './homography';
import { createHomography, type HomographyMatrix } from './homography';

const MIN_CHUNK_POINTS = 10000;

export const warpPointCloudByCornersParallel = (
	positions: Float32Array,
	sourceCorners: GeoRefCorners,
	targetCorners: GeoRefCorners
): Promise<Float32Array> => {
	const count = positions.length / 3;
	const numWorkers = Math.max(
		1,
		Math.min(navigator.hardwareConcurrency ?? 4, Math.ceil(count / MIN_CHUNK_POINTS), 4)
	);
	const homography = createHomography(sourceCorners, targetCorners);

	return new Promise((resolve, reject) => {
		const chunkSize = Math.ceil(count / numWorkers);
		const result = new Float32Array(positions.length);
		const workers: Worker[] = [];
		let completed = 0;
		let rejected = false;

		const cleanup = () => {
			workers.forEach((worker) => worker.terminate());
		};

		for (let i = 0; i < numWorkers; i++) {
			const startIdx = i * chunkSize * 3;
			const endIdx = Math.min((i + 1) * chunkSize * 3, positions.length);
			const chunk = positions.slice(startIdx, endIdx);
			const offset = startIdx;
			const worker = new WarpPointCloudWorker();
			workers.push(worker);

			worker.onmessage = (event: MessageEvent<{ positions?: Float32Array; error?: string; }>) => {
				if (rejected) return;
				if (event.data.error) {
					rejected = true;
					cleanup();
					reject(new Error(event.data.error));
					return;
				}

				if (!event.data.positions) {
					rejected = true;
					cleanup();
					reject(new Error('GeoRef point cloud worker returned empty result'));
					return;
				}

				result.set(event.data.positions, offset);
				completed++;
				if (completed === numWorkers) {
					cleanup();
					resolve(result);
				}
			};

			worker.onerror = (error) => {
				if (rejected) return;
				rejected = true;
				cleanup();
				reject(new Error(error.message));
			};

			worker.postMessage(
				{
					positions: chunk,
					sourceCorners: sourceCorners.map(([x, y]) => [x, y]) as GeoRefCorners,
					homography: { ...homography } as HomographyMatrix
				},
				[chunk.buffer]
			);
		}
	});
};
