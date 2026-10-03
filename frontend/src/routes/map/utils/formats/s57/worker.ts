import { parseS57, type S57Result } from '.';
import { checkS57File } from './files';

export type S57Response = { result: S57Result; } | { error: string; };
self.onmessage = async ({ data }: MessageEvent<{ file: File; }>) => {
	try {
		checkS57File(data.file);
		const result = parseS57(new Uint8Array(await data.file.arrayBuffer()));
		postMessage({ result } satisfies S57Response);
	} catch (error) {
		postMessage(
			{ error: error instanceof Error ? error.message : String(error) } satisfies S57Response
		);
	}
};
