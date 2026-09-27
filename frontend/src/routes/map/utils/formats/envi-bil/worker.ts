import { ensureProjNadgridsReady } from '$routes/map/utils/proj/nadgrid';
import type { RawRaster } from '.';
import type { RawRasterFiles } from './files';
import { projectRawRaster } from './project';
import { readRawRasterFiles } from './read';

export type RawRasterRequest = { type: 'parse'; files: RawRasterFiles; } | {
	type: 'project';
	grid: RawRaster;
	crs: string;
};
export type RawRasterResponse = { result: RawRaster; } | { error: string; };

self.onmessage = async ({ data }: MessageEvent<RawRasterRequest>) => {
	try {
		let result: RawRaster;
		if (data.type === 'parse') {
			result = await readRawRasterFiles(data.files);
		} else {
			await ensureProjNadgridsReady(data.crs);
			result = projectRawRaster(data.grid, data.crs);
		}
		(self as unknown as Worker).postMessage(
			{ result } satisfies RawRasterResponse,
			result.bands.map(band => band.buffer)
		);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies RawRasterResponse
		);
	}
};
