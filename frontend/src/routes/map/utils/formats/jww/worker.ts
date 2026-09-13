import { parseJwc } from '../jwc';
import { type JwwParseResult, parseJww } from '.';

export type JwwWorkerResponse = { result: JwwParseResult; } | { error: string; };

self.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
	try {
		const signature = new TextDecoder().decode(
			new Uint8Array(data, 0, Math.min(13, data.byteLength))
		);
		postMessage(
			{
				result: signature.startsWith('jw_cad(c)data') ? parseJwc(data) : parseJww(data)
			} satisfies JwwWorkerResponse
		);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies JwwWorkerResponse
		);
	}
};
