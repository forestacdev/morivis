import type { FeatureCollection } from '$routes/map/types/geojson';

import type { GeoRefCorners } from './homography';
export { warpPointCloudByCornersParallel } from './warp-pointcloud';

const NUM_WORKERS = 4;

interface WorkerSuccessMessage {
	type: 'TRANSFORMED_BATCH';
	transformedFeatures: FeatureCollection['features'];
	batchIndex: number;
}

interface WorkerErrorMessage {
	type: 'ERROR';
	error: string;
	batchIndex: number;
}

export const warpGeoJSONByCornersParallel = (
	featureCollection: FeatureCollection,
	sourceCorners: GeoRefCorners,
	targetCorners: GeoRefCorners
): Promise<FeatureCollection> => {
	const plainFeatureCollection = JSON.parse(
		JSON.stringify(featureCollection)
	) as FeatureCollection;
	const plainSourceCorners = sourceCorners.map(([x, y]) => [x, y]) as GeoRefCorners;
	const plainTargetCorners = targetCorners.map(([x, y]) => [x, y]) as GeoRefCorners;
	const features = plainFeatureCollection.features;
	const totalFeatures = features.length;

	if (totalFeatures === 0) {
		return Promise.resolve({ type: 'FeatureCollection', features: [] });
	}

	const numWorkers = Math.min(NUM_WORKERS, totalFeatures);
	const batchSize = Math.ceil(totalFeatures / numWorkers);

	return new Promise((resolve, reject) => {
		const resultBatches: FeatureCollection['features'][] = new Array(numWorkers);
		const workers: Worker[] = [];
		let completed = 0;
		let rejected = false;

		const cleanup = () => {
			workers.forEach((worker) => worker.terminate());
		};

		for (let index = 0; index < numWorkers; index += 1) {
			const start = index * batchSize;
			const end = Math.min(start + batchSize, totalFeatures);
			const batch = features.slice(start, end);

			const worker = new Worker(new URL('./transformer.worker.ts', import.meta.url), {
				type: 'module'
			});
			workers.push(worker);

			worker.onmessage = (event: MessageEvent<WorkerSuccessMessage | WorkerErrorMessage>) => {
				if (rejected) return;

				if (event.data.type === 'TRANSFORMED_BATCH') {
					resultBatches[event.data.batchIndex] = event.data.transformedFeatures;
					completed += 1;

					if (completed === numWorkers) {
						cleanup();
						resolve({
							type: 'FeatureCollection',
							features: resultBatches.flat()
						});
					}
					return;
				}

				rejected = true;
				cleanup();
				reject(new Error(event.data.error));
			};

			worker.onerror = (error) => {
				if (rejected) return;
				rejected = true;
				cleanup();
				reject(new Error(error.message));
			};

			worker.postMessage({
				featureCollection: {
					type: 'FeatureCollection',
					features: batch
				},
				sourceCorners: plainSourceCorners,
				targetCorners: plainTargetCorners,
				batchIndex: index
			});
		}
	});
};
