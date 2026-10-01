import { ensureProjNadgridsReady } from '$routes/map/utils/proj/nadgrid';
import { type AsciiGrid, parseAsciiGrid } from '.';
import { projectAsciiGrid } from './project';

export type AsciiGridRequest = { type: 'parse'; file: File; } | {
	type: 'project';
	grid: AsciiGrid;
	crs: string;
};
export type AsciiGridResponse = { result: AsciiGrid; } | { error: string; };

self.onmessage = async ({ data }: MessageEvent<AsciiGridRequest>) => {
	try {
		if (data.type === 'project') await ensureProjNadgridsReady(data.crs);
		const result = data.type === 'parse'
			? parseAsciiGrid(await data.file.text())
			: projectAsciiGrid(data.grid, data.crs);
		(self as unknown as Worker).postMessage({ result } satisfies AsciiGridResponse, [
			result.band.buffer
		]);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies AsciiGridResponse
		);
	}
};
