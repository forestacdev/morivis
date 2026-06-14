import { type RasterizePointCloudParams, rasterizePointCloudToDem } from './rasterize-core';

onmessage = (event: MessageEvent<RasterizePointCloudParams>) => {
	try {
		const result = rasterizePointCloudToDem(event.data);
		postMessage(result);
	} catch (error) {
		postMessage({
			error: error instanceof Error ? error.message : String(error)
		});
	}
};
