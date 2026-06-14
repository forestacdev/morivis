import RasterizePointCloudWorker from './rasterize.worker?worker';

import { runSingleShotWorker } from '$routes/map/utils/worker/run-single-shot';

import type { RasterizePointCloudParams, RasterizePointCloudResult } from './rasterize-core';

export const rasterizePointCloudToDemInWorker = (
	params: RasterizePointCloudParams
): Promise<RasterizePointCloudResult> =>
	runSingleShotWorker<
		RasterizePointCloudParams,
		RasterizePointCloudResult,
		RasterizePointCloudResult
	>(
		RasterizePointCloudWorker,
		{
			positions: params.positions,
			bbox: [...params.bbox] as [number, number, number, number],
			longEdgePixels: params.longEdgePixels
		},
		{
			errorPrefix: 'PointCloud rasterize worker error',
			mapResponse: (response) => response
		}
	);
