import type { GeoRefCorners, HomographyMatrix } from './homography';
import { applyHomography, createHomography } from './homography';

interface WarpPointCloudWorkerRequest {
	positions: Float32Array;
	sourceCorners: GeoRefCorners;
	targetCorners?: GeoRefCorners;
	homography?: HomographyMatrix;
}

onmessage = (event: MessageEvent<WarpPointCloudWorkerRequest>) => {
	try {
		const { positions } = event.data;
		const homography = event.data.homography
			?? createHomography(event.data.sourceCorners, event.data.targetCorners!);
		const warped = new Float32Array(positions.length);

		for (let i = 0; i < positions.length; i += 3) {
			const [lng, lat] = applyHomography([positions[i], positions[i + 1]], homography);
			warped[i] = lng;
			warped[i + 1] = lat;
			warped[i + 2] = positions[i + 2];
		}

		postMessage({ positions: warped }, { transfer: [warped.buffer] });
	} catch (error) {
		postMessage({
			error: error instanceof Error ? error.message : String(error)
		});
	}
};
