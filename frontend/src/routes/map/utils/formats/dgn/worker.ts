import type { DgnResult } from '.';
import { convertDgn } from './convert';
import { checkDgnSize } from './files';

export interface DgnRequest {
	file: File;
	sourceCrs?: string;
}
export type DgnResponse = { result: DgnResult; } | { error: string; };

self.onmessage = async ({ data }: MessageEvent<DgnRequest>) => {
	try {
		checkDgnSize(data.file);
		const result = await convertDgn(
			new Uint8Array(await data.file.arrayBuffer()),
			data.sourceCrs
		);
		postMessage({ result } satisfies DgnResponse);
	} catch (error) {
		postMessage(
			{ error: error instanceof Error ? error.message : String(error) } satisfies DgnResponse
		);
	}
};
