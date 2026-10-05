import type { DxfUnit } from '$routes/map/utils/formats/dxf';
import type { DwgDrawingResult } from '.';

import { analyzeDwgDrawing } from '.';
import type { DwgReadOptions } from './acis';

interface DwgWorkerRequest {
	arrayBuffer: ArrayBuffer;
	unit?: DxfUnit;
	options?: DwgReadOptions;
}

interface DwgWorkerSuccessResponse {
	result: DwgDrawingResult;
}

interface DwgWorkerErrorResponse {
	error: string;
}

self.onmessage = async (event: MessageEvent<DwgWorkerRequest>) => {
	try {
		const result = await analyzeDwgDrawing(
			event.data.arrayBuffer,
			event.data.unit,
			event.data.options
		);
		const buffers = [...new Set(result.solids.map(solid => solid.positions.buffer))].filter((
			buffer
		): buffer is ArrayBuffer => buffer instanceof ArrayBuffer);
		(self as unknown as Worker).postMessage(
			{ result } satisfies DwgWorkerSuccessResponse,
			buffers
		);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies DwgWorkerErrorResponse
		);
	}
};

export type DwgWorkerResponse = DwgWorkerSuccessResponse | DwgWorkerErrorResponse;
