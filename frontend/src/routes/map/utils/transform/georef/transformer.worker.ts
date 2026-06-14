import type { FeatureCollection } from '$routes/map/types/geojson';

import type { GeoRefCorners } from './homography';
import { warpGeoJSONByCorners } from './warp-geojson';

interface WorkerMessageData {
	featureCollection: FeatureCollection;
	sourceCorners: GeoRefCorners;
	targetCorners: GeoRefCorners;
	batchIndex: number;
}

onmessage = (event: MessageEvent<WorkerMessageData>) => {
	const { featureCollection, sourceCorners, targetCorners, batchIndex } = event.data;

	try {
		const transformed = warpGeoJSONByCorners(featureCollection, sourceCorners, targetCorners);

		postMessage({
			type: 'TRANSFORMED_BATCH',
			transformedFeatures: transformed.features,
			batchIndex
		});
	} catch (error) {
		postMessage({
			type: 'ERROR',
			error: error instanceof Error ? error.message : String(error),
			batchIndex
		});
	}
};
