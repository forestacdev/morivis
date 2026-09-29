import { type HgtGrid, readHgtFile } from '.';

export type HgtResponse = { result: HgtGrid; } | { error: string; };

self.onmessage = async ({ data: file }: MessageEvent<File>) => {
	try {
		const result = await readHgtFile(file);
		(self as unknown as Worker).postMessage({ result } satisfies HgtResponse, [
			result.bands[0].buffer
		]);
	} catch (error) {
		postMessage(
			{ error: error instanceof Error ? error.message : String(error) } satisfies HgtResponse
		);
	}
};
