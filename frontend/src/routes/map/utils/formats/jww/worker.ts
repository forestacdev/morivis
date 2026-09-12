import { type JwwParseResult, parseJww } from '.';

export type JwwWorkerResponse = { result: JwwParseResult; } | { error: string; };

self.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
	try {
		postMessage({ result: parseJww(data) } satisfies JwwWorkerResponse);
	} catch (error) {
		postMessage(
			{
				error: error instanceof Error ? error.message : String(error)
			} satisfies JwwWorkerResponse
		);
	}
};
